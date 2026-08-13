-- La versión histórica intentaba insertar libros con columnas y un autor que ya no
-- existen en el esquema de Lettora. En un proyecto nuevo, los libros deben ser
-- creados por perfiles reales para preservar la integridad de `books.author_id`.
--
-- La carga original se conserva en el historial de Git. Esta migración se vuelve
-- deliberadamente segura para permitir reconstruir el esquema desde cero.
DO $$
BEGIN
  RAISE NOTICE 'La carga inicial de obras de dominio público se omite: requiere un perfil de autor válido.';
END;
$$;
