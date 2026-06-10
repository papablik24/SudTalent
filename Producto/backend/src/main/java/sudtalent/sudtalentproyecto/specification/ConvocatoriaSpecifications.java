package sudtalent.sudtalentproyecto.specification;

import org.springframework.data.jpa.domain.Specification;
import sudtalent.sudtalentproyecto.model.Convocatoria;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Especificaciones JPA para consultas complejas de Convocatoria.
 * Respeta soft delete (deleted_at IS NULL)
 */
public class ConvocatoriaSpecifications {
    
    /**
     * Convocatorias no eliminadas
     */
    public static Specification<Convocatoria> isNotDeleted() {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.isNull(root.get("deletedAt"));
    }
    
    /**
     * Por profesor específico
     */
    public static Specification<Convocatoria> byProfesorId(UUID profesorId) {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.equal(root.get("profesor").get("usuarioId"), profesorId);
    }
    
    /**
     * Por tipo de convocatoria
     */
    public static Specification<Convocatoria> byTipo(String tipo) {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.equal(root.get("tipo"), tipo);
    }
    
    /**
     * Por estado
     */
    public static Specification<Convocatoria> byEstado(String estado) {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.equal(root.get("estado"), estado);
    }
    
    /**
     * Convocatorias pendientes
     */
    public static Specification<Convocatoria> pendientes() {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.equal(root.get("estado"), "PENDIENTE");
    }
    
    /**
     * Convocatorias activas/vigentes (fecha >= hoy AND estado = APROBADO)
     */
    public static Specification<Convocatoria> active() {
        return Specification.where(isNotDeleted())
            .and(byEstado("APROBADO"))
            .and((root, query, criteriaBuilder) -> 
                criteriaBuilder.greaterThanOrEqualTo(root.get("fecha"), LocalDate.now())
            );
    }
    
    /**
     * Convocatorias pasadas (fecha < hoy)
     */
    public static Specification<Convocatoria> past() {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.lessThan(root.get("fecha"), LocalDate.now());
    }
    
    /**
     * Convocatorias próximas (fecha entre hoy y N días)
     */
    public static Specification<Convocatoria> upcoming(int days) {
        LocalDate today = LocalDate.now();
        LocalDate futureDate = today.plusDays(days);
        
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.between(root.get("fecha"), today, futureDate);
    }
    
    /**
     * Por rango de fechas
     */
    public static Specification<Convocatoria> betweenDates(LocalDate startDate, LocalDate endDate) {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.between(root.get("fecha"), startDate, endDate);
    }
    
    /**
     * Convocatorias del mes actual
     */
    public static Specification<Convocatoria> thisMonth() {
        LocalDate today = LocalDate.now();
        LocalDate startOfMonth = today.withDayOfMonth(1);
        LocalDate endOfMonth = today.withDayOfMonth(today.lengthOfMonth());
        
        return betweenDates(startOfMonth, endOfMonth);
    }
}
