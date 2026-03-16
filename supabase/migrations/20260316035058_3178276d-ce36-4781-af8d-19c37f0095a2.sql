
-- 1. Add followers_visibility to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS followers_visibility text NOT NULL DEFAULT 'all';

-- 2. Create book_reviews table
CREATE TABLE public.book_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content text CHECK (char_length(content) <= 250),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(book_id, user_id)
);

ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews viewable by everyone" ON public.book_reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert own reviews" ON public.book_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.book_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON public.book_reviews FOR DELETE USING (auth.uid() = user_id);

-- 3. Create staff_birthdays table
CREATE TABLE public.staff_birthdays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id uuid NOT NULL,
  gift_item_id uuid REFERENCES public.profile_items(id),
  message text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_birthdays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff bdays viewable by authenticated" ON public.staff_birthdays FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can create staff bdays" ON public.staff_birthdays FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update staff bdays" ON public.staff_birthdays FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete staff bdays" ON public.staff_birthdays FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- 4. Create staff_bday_messages table
CREATE TABLE public.staff_bday_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bday_id uuid NOT NULL REFERENCES public.staff_birthdays(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_bday_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bday messages viewable by authenticated" ON public.staff_bday_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can send bday messages" ON public.staff_bday_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can delete bday messages" ON public.staff_bday_messages FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- 5. Enable realtime for staff_bday_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_bday_messages;

-- 6. Admin policy to manage followers
CREATE POLICY "Admins can insert followers" ON public.followers FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete followers" ON public.followers FOR DELETE USING (has_role(auth.uid(), 'admin'));
