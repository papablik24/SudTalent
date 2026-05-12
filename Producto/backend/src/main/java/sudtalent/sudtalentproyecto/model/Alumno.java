package sudtalent.sudtalentproyecto.model;

import java.time.LocalDate;
import java.util.Set;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "alumnos")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@PrimaryKeyJoinColumn(name = "usuario_id")  // ← AGREGAR ESTO
public class Alumno extends User {  // ← CAMBIAR: extends User
    
    @Column(name = "fecha_nacimiento")
    private LocalDate fechaNacimiento;
    
    @OneToMany(mappedBy = "alumno")
    private Set<Postulacion> postulaciones;
}
