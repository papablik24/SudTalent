package sudtalent.sudtalentproyecto.security;

import sudtalent.sudtalentproyecto.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        String cleanEmail = email != null ? email.trim().toLowerCase() : "";
        // Try email first, then phone-based synthetic email
        var user = userRepository.findByEmailActive(cleanEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + cleanEmail));

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                user.isActive(),
                true, true, true,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }
}
