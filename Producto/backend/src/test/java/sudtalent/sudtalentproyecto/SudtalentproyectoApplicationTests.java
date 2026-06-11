package sudtalent.sudtalentproyecto;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import sudtalent.sudtalentproyecto.model.Postulacion;
import sudtalent.sudtalentproyecto.model.VoiceAudio;
import sudtalent.sudtalentproyecto.repository.PostulacionRepository;
import sudtalent.sudtalentproyecto.repository.VoiceAudioRepository;
import java.util.UUID;

import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.List;

@SpringBootTest
class SudtalentproyectoApplicationTests {

	@Autowired
	private PostulacionRepository postulacionRepository;

	@Autowired
	private VoiceAudioRepository voiceAudioRepository;

	@Autowired
	private sudtalent.sudtalentproyecto.repository.UserRepository userRepository;

	@PersistenceContext
	private EntityManager entityManager;

	@Test
	void contextLoads() {
	}

	@Autowired
	private org.springframework.context.ApplicationContext applicationContext;

}
