package sudtalent.sudtalentproyecto.model;

import java.time.LocalDate;
import java.util.Set;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "convocatorias")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Convocatoria {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private LocalDate fecha;
    
    @Column(nullable = false)
    private String tipo;
    
    @Column(nullable = false)
    private String estado;
    
    @ManyToOne
    @JoinColumn(name = "profesor_id")
    private Profesor profesor;
    
    @OneToMany(mappedBy = "convocatoria")
    private Set<Postulacion> postulaciones;
}
