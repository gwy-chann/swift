package com.swift.modules.auth.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public class SwiftUserPrincipal implements UserDetails {

    private final UUID id;
    private final String email;
    private final String name;
    private final String role; // "admin" or "staff"
    private final AuthSource source;
    private final boolean elevated;
    private final List<GrantedAuthority> authorities;

    public enum AuthSource {
        SUPABASE_JWT,
        SESSION_COOKIE,
        KIOSK_PIN,
        DEMO_BYPASS
    }

    public SwiftUserPrincipal(UUID id, String email, String name, String role, AuthSource source, boolean elevated) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.role = role != null ? role.toLowerCase() : "staff";
        this.source = source;
        this.elevated = elevated;

        List<GrantedAuthority> auths = new ArrayList<>();
        String normalizedRole = this.role.toUpperCase();
        auths.add(new SimpleGrantedAuthority("ROLE_" + normalizedRole));
        if ("ADMIN".equals(normalizedRole)) {
            auths.add(new SimpleGrantedAuthority("ROLE_STAFF"));
        }
        if (elevated) {
            auths.add(new SimpleGrantedAuthority("ROLE_ELEVATED"));
        }
        this.authorities = List.copyOf(auths);
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getName() { return name; }
    public String getRole() { return role; }
    public AuthSource getSource() { return source; }
    public boolean isElevated() { return elevated; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return null;
    }

    @Override
    public String getUsername() {
        return email != null ? email : (id != null ? id.toString() : "anonymous");
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
