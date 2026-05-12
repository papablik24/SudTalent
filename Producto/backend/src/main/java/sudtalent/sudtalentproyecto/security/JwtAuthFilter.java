package sudtalent.sudtalentproyecto.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import sudtalent.sudtalentproyecto.util.JwtUtils;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;
    private final UserDetailsService userDetailsService;

    @Value("${app.cookie.name}")
    private String cookieName;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        // Try Authorization header first, then fall back to cookie
        extractToken(request).ifPresent(token -> {
            try {
                String email = jwtUtils.extractEmail(token);
                if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    // ✅ SIEMPRE cargar de la BD para obtener authorities confiables
                    UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                    
                    System.out.println("✅ JWT válido para: " + email);
                    System.out.println("   Role/Authorities en BD: " + userDetails.getAuthorities());
                    
                    // Crear token de autenticación con las autoridades de la BD
                    var authToken = new UsernamePasswordAuthenticationToken(
                            email, null, userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    System.out.println("✅ Autenticación establecida correctamente");
                }
            } catch (Exception e) {
                System.out.println("❌ Error en JwtAuthFilter: " + e.getMessage());
                e.printStackTrace();
            }
        });

        filterChain.doFilter(request, response);
    }

    private Optional<String> extractToken(HttpServletRequest request) {
        // 1. Try Authorization: Bearer <token> header
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return Optional.of(authHeader.substring(7));
        }

        // 2. Fall back to cookie
        return extractTokenFromCookie(request);
    }

    private Optional<String> extractTokenFromCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return Optional.empty();
        return Arrays.stream(request.getCookies())
                .filter(c -> cookieName.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst();
    }

    private Optional<List<SimpleGrantedAuthority>> extractAuthoritiesFromToken(String token) {
        try {
            Claims claims = jwtUtils.parseClaims(token);
            System.out.println("🔍 ========== CLAIMS PARSEADAS DEL JWT ==========");
            System.out.println("  Subject (email): " + claims.getSubject());
            System.out.println("  Todas las claims: " + claims);
            
            // Intentar obtener authorities de diferentes formas
            Object authObj = claims.get("authorities");
            System.out.println("  Object 'authorities' raw: " + authObj);
            System.out.println("  Type: " + (authObj != null ? authObj.getClass().getName() : "null"));
            
            List<?> authorities = claims.get("authorities", List.class);
            System.out.println("  Authorities como List: " + authorities);
            
            if (authorities != null && !authorities.isEmpty()) {
                System.out.println("  ✓ Authorities encontradas, tamaño: " + authorities.size());
                List<SimpleGrantedAuthority> result = authorities.stream()
                        .map(auth -> {
                            System.out.println("    - Auth item: " + auth + " (type: " + auth.getClass().getName() + ")");
                            return new SimpleGrantedAuthority((String) auth);
                        })
                        .toList();
                System.out.println("✅ Autoridades convertidas: " + result);
                return Optional.of(result);
            } else {
                System.out.println("❌ No hay authorities en el JWT o está vacío");
                System.out.println("  Todas las keys en claims: " + claims.keySet());
            }
        } catch (Exception e) {
            System.out.println("❌ Error extrayendo autoridades del JWT: " + e.getMessage());
            e.printStackTrace();
        }
        return Optional.empty();
    }
}
