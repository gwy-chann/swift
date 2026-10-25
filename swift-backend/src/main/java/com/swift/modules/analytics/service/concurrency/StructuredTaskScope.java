package com.swift.modules.analytics.service.concurrency;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * Java 21 Virtual Threads Structured Task Scope implementation.
 * Provides StructuredTaskScope.ShutdownOnFailure semantics across virtual threads
 * with fail-fast cancellation and zero platform thread pinning.
 */
public class StructuredTaskScope {

    private static final Logger log = LoggerFactory.getLogger(StructuredTaskScope.class);

    public static class ShutdownOnFailure implements AutoCloseable {

        private final ExecutorService executor;
        private final List<Future<?>> futures = Collections.synchronizedList(new ArrayList<>());
        private final AtomicBoolean shutdown = new AtomicBoolean(false);
        private volatile Throwable firstException = null;

        public ShutdownOnFailure() {
            // Allocate a virtual-thread-per-task executor (Java 21 Project Loom)
            this.executor = Executors.newVirtualThreadPerTaskExecutor();
        }

        /**
         * Forks a task onto an independent Java 21 Virtual Thread.
         */
        public <T> Supplier<T> fork(Callable<T> callable) {
            if (shutdown.get()) {
                throw new IllegalStateException("StructuredTaskScope is shut down");
            }

            CompletableFuture<T> future = new CompletableFuture<>();
            Future<?> worker = executor.submit(() -> {
                try {
                    if (shutdown.get() || Thread.currentThread().isInterrupted()) {
                        future.cancel(true);
                        return;
                    }
                    T result = callable.call();
                    future.complete(result);
                } catch (Throwable ex) {
                    recordFailure(ex);
                    future.completeExceptionally(ex);
                    shutdown();
                }
            });

            futures.add(worker);
            return () -> {
                try {
                    return future.get();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Subtask interrupted", e);
                } catch (ExecutionException e) {
                    throw new RuntimeException(e.getCause());
                }
            };
        }

        private synchronized void recordFailure(Throwable ex) {
            if (this.firstException == null) {
                this.firstException = ex;
            }
        }

        /**
         * Awaits completion of all forked subtasks or until scope is shut down.
         */
        public ShutdownOnFailure join() throws InterruptedException {
            for (Future<?> f : futures) {
                try {
                    f.get();
                } catch (ExecutionException ignored) {
                    // Handled via recorded firstException
                } catch (CancellationException ignored) {
                    // Task cancelled on shutdown
                }
            }
            return this;
        }

        /**
         * Awaits completion with timeout.
         */
        public ShutdownOnFailure joinUntil(long timeout, TimeUnit unit) throws InterruptedException, TimeoutException {
            long deadline = System.nanoTime() + unit.toNanos(timeout);
            for (Future<?> f : futures) {
                long remaining = deadline - System.nanoTime();
                if (remaining <= 0) {
                    shutdown();
                    throw new TimeoutException("StructuredTaskScope deadline exceeded");
                }
                try {
                    f.get(remaining, TimeUnit.NANOSECONDS);
                } catch (ExecutionException ignored) {
                } catch (CancellationException ignored) {
                }
            }
            return this;
        }

        /**
         * Shuts down the scope and cancels all unfinished sibling subtasks.
         */
        public void shutdown() {
            if (shutdown.compareAndSet(false, true)) {
                for (Future<?> f : futures) {
                    if (!f.isDone()) {
                        f.cancel(true);
                    }
                }
            }
        }

        /**
         * Throws an exception if any subtask failed.
         */
        public <X extends Throwable> void throwIfFailed(Function<Throwable, ? extends X> exceptionFunction) throws X {
            if (firstException != null) {
                throw exceptionFunction.apply(firstException);
            }
        }

        public void throwIfFailed() throws ExecutionException {
            if (firstException != null) {
                throw new ExecutionException(firstException);
            }
        }

        public Throwable exception() {
            return firstException;
        }

        @Override
        public void close() {
            shutdown();
            executor.shutdown();
        }
    }
}
