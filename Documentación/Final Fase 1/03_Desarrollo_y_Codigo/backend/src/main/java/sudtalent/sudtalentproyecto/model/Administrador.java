package sudtalent.sudtalentproyecto.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "administradores")
@Getter
@Setter
@NoArgsConstructor
@PrimaryKeyJoinColumn(name = "usuario_id")  // ← AGREGAR ESTO
public class Administrador extends User {  // ← CAMBIAR: extends User
    // No hay campos adicionales específicos para administrador
}