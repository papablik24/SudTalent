package sudtalent.sudtalentproyecto.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import sudtalent.sudtalentproyecto.dto.WhitelistNumberDTO;
import sudtalent.sudtalentproyecto.dto.WhitelistStatsDTO;
import sudtalent.sudtalentproyecto.model.WhitelistNumber;
import sudtalent.sudtalentproyecto.repository.WhitelistNumberRepository;



@Service
@RequiredArgsConstructor
@Transactional
public class WhitelistService {
    private final WhitelistNumberRepository repository;

    public WhitelistNumberDTO createNumber(String phone) {
        if(repository.findByPhone(phone).isPresent()) {
            throw new IllegalArgumentException("Número ya existe");
        }
        WhitelistNumber number = WhitelistNumber.builder()
            .phone(phone)
            .status(WhitelistNumber.Status.PENDIENTE)
            .build();
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

    public void deleteNumber(Long id) {
        repository.deleteById(id);
    }

    private WhitelistNumberDTO toDTO(WhitelistNumber number) {
        return WhitelistNumberDTO.builder()
            .id(number.getId())
            .phone(number.getPhone())
            .status(number.getStatus().toString())
            .createdAt(number.getCreatedAt())
            .updatedAt(number.getUpdatedAt())
            .build();
    }
}
