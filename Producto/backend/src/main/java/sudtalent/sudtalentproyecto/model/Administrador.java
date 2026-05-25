package sudtalent.sudtalentproyecto.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "administradores")
@Getter
@Setter
@PrimaryKeyJoinColumn(name = "usuario_id")
public class Administrador extends User {
    // Hereda todos los campos de User, incluyendo createdAt, updatedAt, deletedAt
}