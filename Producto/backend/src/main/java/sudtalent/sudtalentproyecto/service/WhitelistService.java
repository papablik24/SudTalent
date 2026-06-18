package sudtalent.sudtalentproyecto.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.UUID;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import sudtalent.sudtalentproyecto.dto.StudentWhitelistDTO;
import sudtalent.sudtalentproyecto.dto.WhitelistNumberDTO;
import sudtalent.sudtalentproyecto.dto.WhitelistReportDTO;
import sudtalent.sudtalentproyecto.dto.WhitelistStatsDTO;
import sudtalent.sudtalentproyecto.dto.WhitelistCandidateDTO;
import sudtalent.sudtalentproyecto.dto.ImportSummaryDTO;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.model.WhitelistNumber;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import sudtalent.sudtalentproyecto.repository.WhitelistNumberRepository;



@Service
@RequiredArgsConstructor
@Transactional
public class WhitelistService {
    private final WhitelistNumberRepository repository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public WhitelistNumberDTO createNumber(String phone) {
        if(repository.findByPhone(phone).isPresent()) {
            throw new IllegalArgumentException("Número ya existe");
        }
        WhitelistNumber number = WhitelistNumber.builder()
            .phone(phone)
            .status(WhitelistNumber.Status.PENDIENTE)
            .build();
        
        // Intentar vincular con un usuario existente
        linkUserToWhitelist(number);
        
        return toDTO(repository.save(number));
    }

    public WhitelistStatsDTO getStats() {
        LocalDateTime hoy = LocalDateTime.now().withHour(0).withMinute(0);
        LocalDateTime manana = hoy.plusDays(1);
        
        return WhitelistStatsDTO.builder()
            .totalAutorizados(repository.countByStatus(WhitelistNumber.Status.ACTIVO))
            .ingresosHoy(repository.findByCreatedAtBetween(hoy, manana).size())
            .nuevosSolicitudes(repository.countByStatus(WhitelistNumber.Status.PENDIENTE))
            .build();
    }

    public List<WhitelistNumberDTO> getAllNumbers() {
        return repository.findAllWithUser().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    public WhitelistNumberDTO updateStatus(UUID id, String newStatus) {
        WhitelistNumber number = repository.findById(id)
            .orElseThrow(() -> new RuntimeException("Número no encontrado"));
        number.setStatus(WhitelistNumber.Status.valueOf(newStatus));
        number.setUpdatedAt(LocalDateTime.now());
        return toDTO(repository.save(number));
    }

    // Actualizar por teléfono
    public WhitelistNumberDTO updateByPhone(String phone, WhitelistNumberDTO updates) {
        WhitelistNumber number = getWhitelistNumberByPhoneRobust(phone);
        
        if(updates.getName() != null) {
            number.setName(updates.getName());
        }
        if(updates.getCategory() != null) {
            number.setCategory(updates.getCategory());
        }
        if(updates.getStatus() != null) {
            number.setStatus(WhitelistNumber.Status.valueOf(updates.getStatus()));
        }
        // Actualizar teléfono en whitelist si es diferente y no existe ya
        if(updates.getPhone() != null && !updates.getPhone().equals(phone)) {
            String newPhone = updates.getPhone().replaceAll("[^0-9]", "");
            if (!newPhone.isEmpty() && repository.findByPhone(newPhone).isEmpty()) {
                number.setPhone(newPhone);
            }
        }
        number.setUpdatedAt(LocalDateTime.now());

        // Si tiene usuario vinculado, sincronizar nombre y teléfono en users también
        if (number.getUser() != null) {
            var user = number.getUser();
            if (updates.getName() != null && !updates.getName().isBlank()) {
                user.setName(updates.getName());
            }
            if (updates.getPhone() != null) {
                String newPhone = updates.getPhone().replaceAll("[^0-9]", "");
                if (!newPhone.isEmpty()) {
                    user.setPhone(newPhone);
                    user.setUpdatedAt(LocalDateTime.now());
                }
            }
            userRepository.save(user);
        } else {
            linkUserToWhitelist(number);
        }
        
        return toDTO(repository.save(number));
    }

    public void deleteNumber(UUID id) {
        repository.deleteById(id);
    }

    private WhitelistNumber getWhitelistNumberByPhoneRobust(String phone) {
        String cleanPhone = phone != null ? phone.replaceAll("[^0-9]", "") : "";
        return repository.findByPhone(phone)
            .or(() -> {
                if (!cleanPhone.isEmpty()) {
                    return repository.findByPhone(cleanPhone);
                }
                return java.util.Optional.empty();
            })
            .or(() -> {
                if (!cleanPhone.isEmpty()) {
                    return repository.findByPhone("+" + cleanPhone);
                }
                return java.util.Optional.empty();
            })
            .orElseThrow(() -> new RuntimeException("Número no encontrado: " + phone));
    }

    // Eliminar por teléfono
    public void deleteByPhone(String phone) {
        WhitelistNumber number = getWhitelistNumberByPhoneRobust(phone);
        repository.deleteById(number.getId());
    }

    // ==================== FUNCIONALIDAD 1: Obtener todos los alumnos con estado en whitelist ====================
    
    public List<StudentWhitelistDTO> getAllStudentsWithWhitelistStatus() {
        List<User> allUsers = userRepository.findAll();
        
        return allUsers.stream()
            .map(user -> {
                var whitelist = repository.findByPhone(user.getPhone()); // WhitelistNumber query is fine
                
                StudentWhitelistDTO dto = StudentWhitelistDTO.builder()
                    .userId(user.getId())
                    .name(user.getName())
                    .email(user.getEmail())
                    .phone(user.getPhone())
                    .role(user.getRole().name())
                    .onboarded(user.isOnboarded())
                    .profileType(user.getProfileType() != null ? user.getProfileType().name() : null)
                    .userStatus(user.getStatus().name())
                    .build();
                
                if(whitelist.isPresent()) {
                    WhitelistNumber wl = whitelist.get();
                    dto.setWhitelistId(wl.getId());
                    dto.setWhitelistStatus(wl.getStatus().name());
                    dto.setCategory(wl.getCategory());
                    dto.setWhitelistCreatedAt(wl.getCreatedAt());
                    dto.setWhitelistUpdatedAt(wl.getUpdatedAt());
                    
                    // Determinar estado combinado
                    if(wl.getStatus() == WhitelistNumber.Status.ACTIVO) {
                        dto.setCombinedStatus("AUTHORIZED");
                    } else if(wl.getStatus() == WhitelistNumber.Status.PENDIENTE) {
                        dto.setCombinedStatus("PENDING");
                    } else {
                        dto.setCombinedStatus("REJECTED");
                    }
                } else {
                    dto.setCombinedStatus("NOT_WHITELISTED");
                }
                
                return dto;
            })
            .collect(Collectors.toList());
    }

    // ==================== FUNCIONALIDAD 2: Crear usuario cuando se agrega a whitelist ====================
    
    public WhitelistNumberDTO createNumberWithUser(String phone, String name, String email, String roleStr) {
        if(repository.findByPhone(phone).isPresent()) {
            throw new IllegalArgumentException("Número ya existe en whitelist");
        }
        
        // Normalizar valores: convertir strings vacíos a null para DB
        String finalName = (name != null && !name.trim().isEmpty()) ? name.trim() : null;
        String finalEmail = (email != null && !email.trim().isEmpty()) ? email.trim() : null;
        
        System.out.println("✅ createNumberWithUser:");
        System.out.println("   phone: " + phone);
        System.out.println("   name (input): " + name + " → (final): " + finalName);
        System.out.println("   email (input): " + email + " → (final): " + finalEmail);
        
        // Verificar si el usuario ya existe
        var existingUser = userRepository.findByPhoneActive(phone);
        User user = null;
        
        if(existingUser.isEmpty()) {
            // Crear nuevo usuario
            String syntheticEmail = finalEmail != null ? finalEmail : phone + "@sudtalent.app";
            String syntheticPassword = "whitelist_" + phone + "_sud2026";
            
            User.Role roleEnum = User.Role.ALUMNO;
            if (roleStr != null) {
                try {
                    roleEnum = User.Role.valueOf(roleStr);
                } catch(Exception e) {}
            }

            user = User.builder()
                .name(finalName != null ? finalName : "")
                .email(syntheticEmail)
                .password(passwordEncoder.encode(syntheticPassword))
                .phone(phone)
                .role(roleEnum)
                .onboarded(false)
                .status(User.ProfileStatus.PENDING)
                .active(true)
                .build();
            
            user = userRepository.save(user);
            System.out.println("✅ Nuevo usuario creado desde whitelist: " + phone);
        } else {
            user = existingUser.get();
            System.out.println("ℹ️ Usuario ya existe: " + phone);
        }
        
        User.Role roleEnumWL = User.Role.ALUMNO;
        if (roleStr != null) {
            try {
                roleEnumWL = User.Role.valueOf(roleStr);
            } catch(Exception e) {}
        }

        WhitelistNumber number = WhitelistNumber.builder()
            .phone(phone)
            .name(finalName)
            .email(finalEmail)
            .role(roleEnumWL != null ? roleEnumWL.name() : User.Role.ALUMNO.name())
            .status(WhitelistNumber.Status.PENDIENTE)
            .user(user)
            .build();
        
        System.out.println("   Guardando whitelist con name=" + number.getName() + ", email=" + number.getEmail());
        WhitelistNumber saved = repository.save(number);
        System.out.println("   Guardado: name=" + saved.getName() + ", email=" + saved.getEmail());
        
        return toDTO(saved);
    }

    // ==================== FUNCIONALIDAD 3: Reportes de alumnos autorizados vs pendientes ====================
    
    public WhitelistReportDTO getWhitelistReport() {
        List<User> allUsers = userRepository.findAll();
        long totalStudents = allUsers.size();
        
        long totalWhitelisted = repository.findAll().size();
        long totalAuthorized = repository.countByStatus(WhitelistNumber.Status.ACTIVO);
        long totalPending = repository.countByStatus(WhitelistNumber.Status.PENDIENTE);
        long totalRejected = repository.countByStatus(WhitelistNumber.Status.INACTIVO);
        long totalNotWhitelisted = totalStudents - totalWhitelisted;
        
        double authorizationPercentage = totalWhitelisted > 0 
            ? (totalAuthorized * 100.0) / totalWhitelisted 
            : 0.0;
        
        double whitelistCoverage = totalStudents > 0 
            ? (totalWhitelisted * 100.0) / totalStudents 
            : 0.0;
        
        return WhitelistReportDTO.builder()
            .totalStudents(totalStudents)
            .totalWhitelisted(totalWhitelisted)
            .totalAuthorized(totalAuthorized)
            .totalPending(totalPending)
            .totalRejected(totalRejected)
            .totalNotWhitelisted(totalNotWhitelisted)
            .authorizationPercentage(Math.round(authorizationPercentage * 100.0) / 100.0)
            .whitelistCoverage(Math.round(whitelistCoverage * 100.0) / 100.0)
            .build();
    }

    // Vincular un número de whitelist con un usuario existente
    private void linkUserToWhitelist(WhitelistNumber whitelist) {
        // Buscar usuario por teléfono
        if(whitelist.getPhone() != null) {
            var userByPhone = userRepository.findByPhoneActive(whitelist.getPhone());
            if(userByPhone.isPresent()) {
                whitelist.setUser(userByPhone.get());
                if(whitelist.getName() == null) {
                    whitelist.setName(userByPhone.get().getName());
                }
                if(whitelist.getEmail() == null) {
                    whitelist.setEmail(userByPhone.get().getEmail());
                }
                System.out.println("✅ Whitelist vinculada a usuario por teléfono: " + whitelist.getPhone());
                return;
            }
        }
        
        // Buscar usuario por email (si no se encontró por teléfono)
        if(whitelist.getEmail() != null && !whitelist.getEmail().isEmpty()) {
            var userByEmail = userRepository.findByEmailActive(whitelist.getEmail());
            if(userByEmail.isPresent()) {
                whitelist.setUser(userByEmail.get());
                System.out.println("✅ Whitelist vinculada a usuario por email: " + whitelist.getEmail());
                return;
            }
        }
        
        System.out.println("ℹ️ No se encontró usuario para vincular con whitelist: " + whitelist.getPhone());
    }

    // ==================== FUNCIONALIDAD 4: Sincronizar whitelist con users existentes ====================

    public int syncWhitelistWithUsers() {
        List<WhitelistNumber> unlinked = repository.findAll().stream()
            .filter(wl -> wl.getUser() == null)
            .collect(Collectors.toList());

        int count = 0;
        for (WhitelistNumber wl : unlinked) {
            boolean linked = false;

            // Intentar vincular por teléfono
            if (wl.getPhone() != null) {
                var userByPhone = userRepository.findByPhoneActive(wl.getPhone());
                if (userByPhone.isPresent()) {
                    wl.setUser(userByPhone.get());
                    if (wl.getName() == null && userByPhone.get().getName() != null) {
                        wl.setName(userByPhone.get().getName());
                    }
                    linked = true;
                }
            }

            // Si no, intentar vincular por email
            if (!linked && wl.getEmail() != null && !wl.getEmail().isEmpty()) {
                var userByEmail = userRepository.findByEmailActive(wl.getEmail());
                if (userByEmail.isPresent()) {
                    wl.setUser(userByEmail.get());
                    linked = true;
                }
            }

            if (linked) {
                wl.setUpdatedAt(java.time.LocalDateTime.now());
                repository.save(wl);
                count++;
                System.out.println("✅ Sincronizado whitelist " + wl.getPhone() + " → user id " + wl.getUser().getId());
            }
        }

        System.out.println("ℹ️ Sync completado: " + count + " de " + unlinked.size() + " entradas vinculadas.");
        return count;
    }

    // ==================== FUNCIONALIDAD 5: Reparar passwords legacy sin BCrypt ====================

    public int fixLegacyPasswords() {
        List<User> allUsers = userRepository.findAll();
        int fixed = 0;

        for (User user : allUsers) {
            // Los passwords BCrypt siempre empiezan con $2a$ o $2b$
            if (user.getPassword() != null && !user.getPassword().startsWith("$2")) {
                String raw = user.getPassword();
                user.setPassword(passwordEncoder.encode(raw));
                userRepository.save(user);
                fixed++;
                System.out.println("🔧 Password re-encodificado para: " + user.getEmail());
            }
        }

        System.out.println("ℹ️ Fix legacy passwords: " + fixed + " usuario(s) reparado(s).");
        return fixed;
    }

    public String normalizeChileanPhone(String raw) {
        if (raw == null) return null;
        String clean = raw.replaceAll("[^0-9]", "");
        if (clean.length() == 9 && clean.startsWith("9")) {
            return "56" + clean;
        } else if (clean.length() == 11 && clean.startsWith("56")) {
            return clean;
        } else if (clean.length() == 8) {
            return "569" + clean;
        }
        return clean.isEmpty() ? null : clean;
    }

    private boolean checkPhoneExistsInDB(String normalizedPhone) {
        String clean = normalizedPhone.replaceAll("[^0-9]", "");
        if (repository.findByPhone(normalizedPhone).isPresent()) return true;
        if (repository.findByPhone(clean).isPresent()) return true;
        if (repository.findByPhone("+" + clean).isPresent()) return true;
        if (userRepository.findByPhoneActive(normalizedPhone).isPresent()) return true;
        if (userRepository.findByPhoneActive(clean).isPresent()) return true;
        return false;
    }

    public List<WhitelistCandidateDTO> previewImport(String text) {
        List<WhitelistCandidateDTO> candidates = new ArrayList<>();
        if (text == null || text.trim().isEmpty()) {
            return candidates;
        }

        String[] lines = text.split("\\r?\\n");
        Pattern phonePattern = Pattern.compile(
            "(\\+?56\\s*9\\s*\\d{4}\\s*\\d{4})|(\\+?56\\s*9\\s*\\d{8})|(\\b9\\s*\\d{4}\\s*\\d{4}\\b)|(\\b9\\s*\\d{8}\\b)|(\\b\\d{8}\\b)"
        );

        Set<String> seenNormalized = new HashSet<>();

        for (String line : lines) {
            Matcher matcher = phonePattern.matcher(line);
            if (matcher.find()) {
                String rawPhone = matcher.group();
                String rawName = line.replace(rawPhone, "")
                    .replaceAll("[:\\-~()\\[\\]\\*\\_\\t\\r]", " ")
                    .replaceAll("\\s+", " ")
                    .trim();

                String name = rawName.isEmpty() ? "Contacto WhatsApp" : rawName;
                String normalized = normalizeChileanPhone(rawPhone);

                String status;
                String validationMessage = "";

                if (normalized == null || normalized.length() != 11 || !normalized.startsWith("569")) {
                    status = "INVALID";
                    validationMessage = "Teléfono inválido (debe ser celular chileno)";
                } else if (seenNormalized.contains(normalized)) {
                    status = "DUPLICATE";
                    validationMessage = "Duplicado en el texto pegado";
                } else {
                    boolean exists = checkPhoneExistsInDB(normalized);
                    if (exists) {
                        status = "ALREADY_EXISTS";
                        validationMessage = "Ya está en la whitelist o registrado";
                    } else {
                        status = "VALID";
                        validationMessage = "Listo para autorizar";
                        seenNormalized.add(normalized);
                    }
                }

                candidates.add(WhitelistCandidateDTO.builder()
                    .name(name)
                    .rawPhone(rawPhone)
                    .normalizedPhone(normalized != null ? normalized : rawPhone)
                    .status(status)
                    .validationMessage(validationMessage)
                    .build());
            }
        }
        return candidates;
    }

    public ImportSummaryDTO confirmImport(List<WhitelistCandidateDTO> candidates) {
        int agregados = 0;
        int omitidosDuplicados = 0;
        int invalidos = 0;
        int yaExistentes = 0;

        for (WhitelistCandidateDTO candidate : candidates) {
            if ("INVALID".equals(candidate.getStatus())) {
                invalidos++;
                continue;
            }
            if ("DUPLICATE".equals(candidate.getStatus())) {
                omitidosDuplicados++;
                continue;
            }

            String normalized = normalizeChileanPhone(candidate.getNormalizedPhone());
            if (normalized == null) {
                invalidos++;
                continue;
            }

            if (checkPhoneExistsInDB(normalized)) {
                yaExistentes++;
                continue;
            }

            // Crear entrada únicamente en whitelist, sin forzar usuario
            WhitelistNumber wl = WhitelistNumber.builder()
                .phone(normalized)
                .name(candidate.getName() != null && !candidate.getName().equals("Contacto WhatsApp") ? candidate.getName().trim() : null)
                .status(WhitelistNumber.Status.PENDIENTE)
                .role(User.Role.ALUMNO.name())
                .build();

            linkUserToWhitelist(wl);
            repository.save(wl);
            agregados++;
        }

        return ImportSummaryDTO.builder()
            .agregados(agregados)
            .omitidosDuplicados(omitidosDuplicados)
            .invalidos(invalidos)
            .yaExistentes(yaExistentes)
            .build();
    }

    private WhitelistNumberDTO toDTO(WhitelistNumber number) {
        String displayName = number.getName();
        String displayEmail = number.getEmail();
        if (number.getUser() != null) {
            if (number.getUser().getName() != null && !number.getUser().getName().isBlank()) {
                displayName = number.getUser().getName();
            }
            if (number.getUser().getEmail() != null && !number.getUser().getEmail().isBlank()) {
                displayEmail = number.getUser().getEmail();
            }
        }
        return WhitelistNumberDTO.builder()
            .id(number.getId())
            .phone(number.getPhone())
            .name(displayName)
            .email(displayEmail)
            .category(number.getCategory())
            .role(number.getRole() != null ? number.getRole().name() : null)
            .status(number.getStatus().toString())
            .userId(number.getUser() != null ? number.getUser().getId() : null)
            .userStatus(number.getUser() != null && number.getUser().getStatus() != null
                ? number.getUser().getStatus().name()
                : null)
            .createdAt(number.getCreatedAt())
            .updatedAt(number.getUpdatedAt())
            .build();
    }
}
