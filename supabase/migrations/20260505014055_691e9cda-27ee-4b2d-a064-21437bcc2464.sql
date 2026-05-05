
-- Tabla de check-ins diarios
CREATE TABLE public.daily_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, check_in_date)
);
CREATE INDEX idx_daily_check_ins_user_date ON public.daily_check_ins(user_id, check_in_date DESC);
ALTER TABLE public.daily_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own check-ins" ON public.daily_check_ins
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own check-ins" ON public.daily_check_ins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tabla de rachas
CREATE TABLE public.user_streaks (
  user_id UUID PRIMARY KEY,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_check_in DATE,
  total_days INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Streaks viewable by everyone" ON public.user_streaks
  FOR SELECT USING (true);
CREATE POLICY "Users upsert own streak" ON public.user_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own streak" ON public.user_streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- Catálogo de medallas mensuales
CREATE TABLE public.monthly_medals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  description TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.monthly_medals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Medals catalog public" ON public.monthly_medals FOR SELECT USING (true);

-- Medallas ganadas por usuario
CREATE TABLE public.user_monthly_medals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  medal_id UUID NOT NULL REFERENCES public.monthly_medals(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  days_count INTEGER NOT NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, month, year)
);
CREATE INDEX idx_user_monthly_medals_user ON public.user_monthly_medals(user_id, awarded_at DESC);
ALTER TABLE public.user_monthly_medals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medals viewable by everyone" ON public.user_monthly_medals FOR SELECT USING (true);
CREATE POLICY "System inserts medals" ON public.user_monthly_medals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insertar 32 medallas
INSERT INTO public.monthly_medals (slug, name, emoji, description, rarity, display_order) VALUES
('lector-constante','Lector Constante','📖','Tu pasión por leer no se detiene.','common',1),
('pluma-oro','Pluma de Oro','🪶','Escritura digna de leyenda.','rare',2),
('tinta-eterna','Tinta Eterna','🖋️','Las palabras que nunca se borran.','rare',3),
('guardian-historias','Guardián de Historias','🛡️','Custodio de relatos eternos.','epic',4),
('susurro-literario','Susurro Literario','🌬️','Voz suave que cautiva.','common',5),
('faro-palabras','Faro de Palabras','🗼','Guía a otros lectores.','rare',6),
('corazon-narrador','Corazón Narrador','💖','Cuentas con el alma.','common',7),
('alma-poeta','Alma de Poeta','🎭','Versos que conmueven.','rare',8),
('viajero-mundos','Viajero de Mundos','🌍','Exploras universos infinitos.','epic',9),
('sombra-lector','Sombra del Lector','🌑','Lees en silencio, sin descanso.','common',10),
('eco-versos','Eco de Versos','🔔','Tus palabras resuenan.','rare',11),
('estrella-naciente','Estrella Naciente','⭐','Brillas con fuerza propia.','rare',12),
('luna-letras','Luna de Letras','🌙','Lectura nocturna sin igual.','common',13),
('sol-paginas','Sol de Páginas','☀️','Iluminas cada capítulo.','common',14),
('brisa-narrativa','Brisa Narrativa','🍃','Tu prosa es ligera y fresca.','common',15),
('llama-creativa','Llama Creativa','🔥','Tu creatividad arde sin parar.','rare',16),
('rio-ideas','Río de Ideas','🌊','Fluyes con inspiración.','common',17),
('montana-sabia','Montaña Sabia','⛰️','Sabiduría inquebrantable.','epic',18),
('bosque-cuentos','Bosque de Cuentos','🌲','Cada hoja, una historia.','rare',19),
('oceano-profundo','Océano Profundo','🌊','Lecturas sin fondo.','epic',20),
('cielo-infinito','Cielo Infinito','☁️','Imaginación sin límites.','rare',21),
('aurora-literaria','Aurora Literaria','🌅','Comienzos llenos de magia.','epic',22),
('tormenta-ideas','Tormenta de Ideas','⛈️','Creatividad arrolladora.','rare',23),
('cristal-memoria','Cristal de Memoria','💎','Recuerdas cada palabra.','epic',24),
('fuego-eterno','Fuego Eterno','🔥','Pasión que nunca se apaga.','legendary',25),
('nieve-silenciosa','Nieve Silenciosa','❄️','Lectura tranquila y pura.','common',26),
('verano-dorado','Verano Dorado','🌻','Días llenos de letras.','rare',27),
('otono-melancolico','Otoño Melancólico','🍂','Belleza en lo nostálgico.','rare',28),
('invierno-reflexivo','Invierno Reflexivo','🌨️','Pensamientos profundos.','rare',29),
('primavera-renacida','Primavera Renacida','🌸','Renaces con cada lectura.','rare',30),
('eco-tiempo','Eco del Tiempo','⏳','Tu legado perdura.','epic',31),
('leyenda-lettora','Leyenda Lettora','🏆','El máximo honor literario.','legendary',32);

-- Función para registrar check-in y otorgar medalla si corresponde
CREATE OR REPLACE FUNCTION public.record_daily_check_in()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_streak RECORD;
  v_new_current INTEGER;
  v_new_longest INTEGER;
  v_inserted BOOLEAN := false;
  v_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE)::INT;
  v_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  v_days_this_month INTEGER;
  v_medal RECORD;
  v_already UUID;
  v_medal_idx INTEGER;
  v_total_medals INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('error','not authenticated');
  END IF;

  -- Insertar check-in si no existe
  INSERT INTO public.daily_check_ins (user_id, check_in_date)
  VALUES (v_user, v_today)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_already;
  v_inserted := v_already IS NOT NULL;

  -- Recuperar streak actual
  SELECT * INTO v_streak FROM public.user_streaks WHERE user_id = v_user;

  IF v_streak IS NULL THEN
    INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_check_in, total_days)
    VALUES (v_user, 1, 1, v_today, 1);
    v_new_current := 1; v_new_longest := 1;
  ELSIF v_streak.last_check_in = v_today THEN
    v_new_current := v_streak.current_streak;
    v_new_longest := v_streak.longest_streak;
  ELSE
    IF v_streak.last_check_in = v_yesterday THEN
      v_new_current := v_streak.current_streak + 1;
    ELSE
      v_new_current := 1;
    END IF;
    v_new_longest := GREATEST(v_streak.longest_streak, v_new_current);
    UPDATE public.user_streaks
      SET current_streak = v_new_current,
          longest_streak = v_new_longest,
          last_check_in = v_today,
          total_days = total_days + CASE WHEN v_inserted THEN 1 ELSE 0 END,
          updated_at = now()
      WHERE user_id = v_user;
  END IF;

  -- Contar días del mes
  SELECT COUNT(*) INTO v_days_this_month
  FROM public.daily_check_ins
  WHERE user_id = v_user
    AND EXTRACT(MONTH FROM check_in_date)::INT = v_month
    AND EXTRACT(YEAR FROM check_in_date)::INT = v_year;

  -- Si llegó a 20 y no tiene medalla del mes, otorgar
  IF v_days_this_month >= 20 THEN
    SELECT id INTO v_already FROM public.user_monthly_medals
    WHERE user_id = v_user AND month = v_month AND year = v_year;

    IF v_already IS NULL THEN
      SELECT COUNT(*) INTO v_total_medals FROM public.monthly_medals;
      v_medal_idx := ((v_year * 12 + v_month - 1) % v_total_medals) + 1;
      SELECT * INTO v_medal FROM public.monthly_medals
        ORDER BY display_order OFFSET (v_medal_idx - 1) LIMIT 1;

      INSERT INTO public.user_monthly_medals (user_id, medal_id, month, year, days_count)
      VALUES (v_user, v_medal.id, v_month, v_year, v_days_this_month);

      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (v_user, 'medal',
        '¡Nueva medalla mensual! ' || v_medal.emoji,
        'Has desbloqueado «' || v_medal.name || '» por conectarte ' || v_days_this_month || ' días este mes.',
        '/medals');

      RETURN jsonb_build_object(
        'check_in', v_inserted,
        'streak', v_new_current,
        'days_this_month', v_days_this_month,
        'medal_awarded', jsonb_build_object('name', v_medal.name, 'emoji', v_medal.emoji)
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'check_in', v_inserted,
    'streak', v_new_current,
    'days_this_month', v_days_this_month,
    'medal_awarded', null
  );
END;
$$;
