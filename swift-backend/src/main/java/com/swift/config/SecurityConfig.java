package com.swift.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swift.common.dto.ApiResponse;
import com.swift.modules.auth.security.CookieAuthenticationFilter;
import com.swift.modules.auth.security.SupabaseJwtAuthFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final SupabaseJwtAuthFilter jwtAuthFilter;
    private final CookieAuthenticationFilter cookieAuthFilter;
    private final ObjectMapper objectMapper;

    public SecurityConfig(SupabaseJwtAuthFilter jwtAuthFilter,
                          CookieAuthenticationFilter cookieAuthFilter,
                          ObjectMapper objectMapper) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.cookieAuthFilter = cookieAuthFilter;
        this.objectMapper = objectMapper;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    com.swift.common.dto.ErrorDetails error = new com.swift.common.dto.ErrorDetails(
                        java.time.Instant.now(),
                        HttpServletResponse.SC_UNAUTHORIZED,
                        "Unauthorized",
                        "Full authentication is required to access this resource",
                        request.getRequestURI(),
                        null
                    );
                    response.getWriter().write(objectMapper.writeValueAsString(error));
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    com.swift.common.dto.ErrorDetails error = new com.swift.common.dto.ErrorDetails(
                        java.time.Instant.now(),
                        HttpServletResponse.SC_FORBIDDEN,
                        "Forbidden",
                        "Access is denied. Insufficient administrative privileges.",
                        request.getRequestURI(),
                        null
                    );
                    response.getWriter().write(objectMapper.writeValueAsString(error));
                })
            )
            .authorizeHttpRequests(auth -> auth
                // Actuator & Documentation
                .requestMatchers("/actuator/**", "/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                // Auth & Kiosk public authentication endpoints
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/api/v1/staff/kiosk-auth", "/api/v1/staff/admin-elevation").permitAll()
                .requestMatchers("/api/v1/shifts/**", "/api/v1/staff/attendance-history").permitAll()
                .requestMatchers("/api/v1/pos/**").permitAll()
                // Read-heavy Catalog, MotoMatcher & Pricecheck public terminal endpoints
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/motomatcher/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/inventory/pricecheck").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/services/labor/**").permitAll()
                // Admin protected endpoints
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                // All other API endpoints require authenticated principal (JWT or Session Cookie)
                .requestMatchers("/api/v1/**").authenticated()
                .anyRequest().permitAll()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(cookieAuthFilter, SupabaseJwtAuthFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("http://localhost:*", "http://127.0.0.1:*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
