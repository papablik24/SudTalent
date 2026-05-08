package sudtalent.sudtalentproyecto.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import sudtalent.sudtalentproyecto.dto.StudentWhitelistDTO;
import sudtalent.sudtalentproyecto.dto.WhitelistNumberDTO;
import sudtalent.sudtalentproyecto.dto.WhitelistReportDTO;
import sudtalent.sudtalentproyecto.dto.WhitelistStatsDTO;
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
        return repository.findAll().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    public WhitelistNumberDTO updateStatus(Long id, String newStatus) {
        WhitelistNumber number = repository.findById(id)
            .orElseThrow(() -> new RuntimeException("Número no encontrado"));
        number.setStatus(WhitelistNumber.Status.valueOf(newStatus));
        number.setUpdatedAt(LocalDateTime.now());
        return toDTO(repository.save(number));
    }

    // Actualizar por teléfono
    public WhitelistNumberDTO updateByPhone(String phone, WhitelistNumberDTO updates) {
        WhitelistNumber number = repository.findByPhone(phone)
            .orElseThrow(() -> new RuntimeException("Número no encontrado: " + phone));
        
        if(updates.getName() != null) {
            number.setName(updates.getName());
        }
        if(updates.getCategory() != null) {
            number.setCategory(updates.getCategory());
        }
        if(updates.getStatus() != null) {
            number.setStatus(WhitelistNumber.Status.valueOf(updates.getStatus()));
        }
        number.setUpdatedAt(LocalDateTime.now());
        
        // Intentar vincular con un usuario si no está vinculado
        if(number.getUser() == null) {
            linkUserToWhitelist(number);
        }
        
        return toDTO(repository.save(number));
    }

    public void deleteNumber(Long id) {
        repository.deleteById(id);
    }

    // Eliminar por teléfono
    public void deleteByPhone(String phone) {
        WhitelistNumber number = repository.findByPhone(phone)
            .orElseThrow(() -> new RuntimeException("Número no encontrado: " + phone));
        repository.deleteById(number.getId());
    }

    // ==================== FUNCIONALIDAD 1: Obtener todos los alumnos con estado en whitelist ====================
    
    public List<StudentWhitelistDTO> getAllStudentsWithWhitelistStatus() {
        List<User> allUsers = userRepository.findAll();
        
        return allUsers.stream()
            .map(user -> {
                var whitelist = repository.findByPhone(user.getPhone());
                
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
    
    public WhitelistNumberDTO createNumberWithUser(String phone, String name, String email) {
        if(repository.findByPhone(phone).isPresent()) {
            throw new IllegalArgumentException("Número ya existe en whitelist");
        }
        
        // Verificar si el usuario ya existe
        var existingUser = userRepository.findByPhone(phone);
        User user = null;
        
        if(existingUser.isEmpty()) {
            // Crear nuevo usuario
            String syntheticEmail = email != null && !email.isEmpty() ? email : phone + "@sudtalent.app";
            String syntheticPassword = "whitelist_" + phone + "_sud2026";
            
            user = User.builder()
                .name(name != null ? name : "")
                .email(syntheticEmail)
                .password(syntheticPassword) // En producción, usar PasswordEncoder
                .phone(phone)
                .role(User.Role.ALUMNO)
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
        
        // Crear número de whitelist vinculado al usuario
        WhitelistNumber number = WhitelistNumber.builder()
            .phone(phone)
            .name(name)
            .email(email)
            .status(WhitelistNumber.Status.PENDIENTE)
            .user(user)
            .build();
        
        return toDTO(repository.save(number));
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
            var userByPhone = userRepository.findByPhone(whitelist.getPhone());
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
        
        // Buscar usuario por nombre y email
        if(whitelist.getName() != null && whitelist.getEmail() != null) {
            var userByNameEmail = userRepository.findByNameAndEmail(whitelist.getName(), whitelist.getEmail());
            if(userByNameEmail.isPresent()) {
                whitelist.setUser(userByNameEmail.get());
                System.out.println("✅ Whitelist vinculada a usuario por nombre y email: " + whitelist.getName());
                return;
            }
        }
        
        System.out.println("ℹ️ No se encontró usuario para vincular con whitelist: " + whitelist.getPhone());
    }

    private WhitelistNumberDTO toDTO(WhitelistNumber number) {
        return WhitelistNumberDTO.builder()
            .id(number.getId())
            .phone(number.getPhone())
            .name(number.getName())
            .email(number.getEmail())
            .category(number.getCategory())
            .status(number.getStatus().toString())
            .createdAt(number.getCreatedAt())
            .updatedAt(number.getUpdatedAt())
            .build();
    }
}
