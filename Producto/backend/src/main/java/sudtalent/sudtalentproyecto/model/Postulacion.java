package sudtalent.sudtalentproyecto.model;

import java.time.LocalDate;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "postulaciones", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"alumno_id", "convocatoria_id"})  // ← AGREGAR ESTO
})
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Postulacion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "alumno_id")
    private Alumno alumno;
    
    @ManyToOne
    @JoinColumn(name = "convocatoria_id")
    private Convocatoria convocatoria;
    
    @Column(name = "fecha_postulacion")
    private LocalDate fechaPostulacion;
}