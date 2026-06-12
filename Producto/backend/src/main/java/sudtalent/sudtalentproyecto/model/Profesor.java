package sudtalent.sudtalentproyecto.model;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "profesores")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Profesor {
    
    @Id
    @Column(columnDefinition = "uuid")
    private UUID usuarioId;
    
    @OneToOne
    @JoinColumn(name = "usuario_id", insertable = false, updatable = false)
    private User usuario;
    
    @Column(nullable = false)
    private String especialidad;

    @Column(name = "cursos_asignados", length = 1000)
    private String cursosAsignados;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
    
    @OneToMany(mappedBy = "profesor", cascade = CascadeType.ALL)
    private Set<Convocatoria> convocatorias;
}