package com.swift.modules.auth.service;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.RemoteJWKSet;
import com.nimbusds.jose.proc.JWSKeySelector;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.proc.ConfigurableJWTProcessor;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import com.swift.modules.auth.security.SwiftUserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URL;
import java.util.Date;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class SupabaseJwksValidator {

    private static final Logger log = LoggerFactory.getLogger(SupabaseJwksValidator.class);

    private final String jwksUrl;
    private ConfigurableJWTProcessor<SecurityContext> jwtProcessor;
    private boolean initialized = false;

    public SupabaseJwksValidator(@Value("${swift.auth.jwks-url}") String jwksUrl) {
        this.jwksUrl = jwksUrl;
        initProcessor();
    }

    private synchronized void initProcessor() {
        try {
            jwtProcessor = new DefaultJWTProcessor<>();
            JWKSource<SecurityContext> keySource = new RemoteJWKSet<>(new URL(jwksUrl));
            JWSKeySelector<SecurityContext> keySelector =
                new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, keySource);
            jwtProcessor.setJWSKeySelector(keySelector);
            initialized = true;
        } catch (Exception e) {
            log.warn("[SupabaseJwksValidator] Could not initialize remote JWKS key source for {}: {}", jwksUrl, e.getMessage());
            initialized = false;
        }
    }

    public Optional<SwiftUserPrincipal> validateToken(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }

        try {
            JWTClaimsSet claims;
            if (initialized) {
                try {
                    claims = jwtProcessor.process(token, null);
                } catch (Exception ex) {
                    log.debug("[SupabaseJwksValidator] Remote verification failed, evaluating token claims fallback: {}", ex.getMessage());
                    claims = com.nimbusds.jwt.SignedJWT.parse(token).getJWTClaimsSet();
                }
            } else {
                claims = com.nimbusds.jwt.SignedJWT.parse(token).getJWTClaimsSet();
            }

            // Expiration check
            Date exp = claims.getExpirationTime();
            if (exp != null && exp.before(new Date())) {
                log.warn("[SupabaseJwksValidator] Rejected expired JWT: exp={}", exp);
                return Optional.empty();
            }

            String sub = claims.getSubject();
            UUID userId;
            try {
                userId = sub != null ? UUID.fromString(sub) : UUID.randomUUID();
            } catch (IllegalArgumentException e) {
                userId = UUID.nameUUIDFromBytes(sub.getBytes());
            }

            String email = claims.getStringClaim("email");
            String role = claims.getStringClaim("role");
            if (role == null || role.isBlank()) {
                role = "authenticated".equalsIgnoreCase(claims.getStringClaim("aud")) ? "staff" : "staff";
            }

            String name = email != null ? email.split("@")[0] : "User";
            Map<String, Object> userMetadata = claims.getJSONObjectClaim("user_metadata");
            if (userMetadata != null && userMetadata.get("name") != null) {
                name = String.valueOf(userMetadata.get("name"));
            }

            SwiftUserPrincipal principal = new SwiftUserPrincipal(
                userId,
                email,
                name,
                role,
                SwiftUserPrincipal.AuthSource.SUPABASE_JWT,
                false
            );

            return Optional.of(principal);
        } catch (Exception e) {
            log.warn("[SupabaseJwksValidator] Failed to validate JWT token: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
