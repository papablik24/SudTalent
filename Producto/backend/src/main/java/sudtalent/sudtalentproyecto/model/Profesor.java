package sudtalent.sudtalentproyecto.model;

import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "profesores")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Profesor {
    @Id
    private Long usuarioId;
    
    @OneToOne
    @JoinColumn(name = "usuario_id")
    private User usuario;
    
    @Column(nullable = false)
    private String especialidad;
    
    @OneToMany(mappedBy = "profesor")
    private Set<Convocatoria> convocatorias;
}