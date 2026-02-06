
-- Create notification trigger for new followers
CREATE OR REPLACE FUNCTION public.notify_new_follower()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _follower_name TEXT;
BEGIN
  SELECT COALESCE(display_name, username, 'Alguien') INTO _follower_name
  FROM public.profiles WHERE id = NEW.follower_id;

  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (
    NEW.following_id,
    'follow',
    'Nuevo seguidor',
    _follower_name || ' comenzó a seguirte',
    '/user/' || NEW.follower_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_follower
  AFTER INSERT ON public.followers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_follower();

-- Create notification trigger for likes
CREATE OR REPLACE FUNCTION public.notify_new_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _liker_name TEXT;
  _target_owner_id UUID;
  _target_title TEXT;
  _link TEXT;
BEGIN
  SELECT COALESCE(display_name, username, 'Alguien') INTO _liker_name
  FROM public.profiles WHERE id = NEW.user_id;

  IF NEW.likeable_type = 'book' THEN
    SELECT author_id, title INTO _target_owner_id, _target_title
    FROM public.books WHERE id = NEW.likeable_id;
    _link := '/book/' || NEW.likeable_id;
  ELSIF NEW.likeable_type = 'microstory' THEN
    SELECT author_id, COALESCE(title, LEFT(content, 30)) INTO _target_owner_id, _target_title
    FROM public.microstories WHERE id = NEW.likeable_id;
    _link := '/microstories';
  ELSE
    RETURN NEW;
  END IF;

  IF _target_owner_id IS NOT NULL AND _target_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      _target_owner_id,
      'like',
      'Nuevo me gusta',
      _liker_name || ' le dio me gusta a "' || COALESCE(_target_title, 'tu publicación') || '"',
      _link
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_like
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_like();

-- Create notification trigger for chapter likes
CREATE OR REPLACE FUNCTION public.notify_chapter_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _liker_name TEXT;
  _book_author_id UUID;
  _chapter_title TEXT;
  _book_id UUID;
BEGIN
  SELECT COALESCE(display_name, username, 'Alguien') INTO _liker_name
  FROM public.profiles WHERE id = NEW.user_id;

  SELECT c.title, c.book_id, b.author_id 
  INTO _chapter_title, _book_id, _book_author_id
  FROM public.chapters c
  JOIN public.books b ON b.id = c.book_id
  WHERE c.id = NEW.chapter_id;

  IF _book_author_id IS NOT NULL AND _book_author_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      _book_author_id,
      'chapter_like',
      'Me gusta en capítulo',
      _liker_name || ' le dio me gusta a "' || COALESCE(_chapter_title, 'tu capítulo') || '"',
      '/book/' || _book_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_chapter_like
  AFTER INSERT ON public.chapter_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_chapter_like();

-- Create notification trigger for comments
CREATE OR REPLACE FUNCTION public.notify_new_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _commenter_name TEXT;
  _target_owner_id UUID;
  _target_title TEXT;
  _link TEXT;
BEGIN
  SELECT COALESCE(display_name, username, 'Alguien') INTO _commenter_name
  FROM public.profiles WHERE id = NEW.user_id;

  IF NEW.commentable_type = 'book' THEN
    SELECT author_id, title INTO _target_owner_id, _target_title
    FROM public.books WHERE id = NEW.commentable_id;
    _link := '/book/' || NEW.commentable_id;
  ELSIF NEW.commentable_type = 'microstory' THEN
    SELECT author_id, COALESCE(title, LEFT(content, 30)) INTO _target_owner_id, _target_title
    FROM public.microstories WHERE id = NEW.commentable_id;
    _link := '/microstories';
  ELSE
    RETURN NEW;
  END IF;

  IF _target_owner_id IS NOT NULL AND _target_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      _target_owner_id,
      'comment',
      'Nuevo comentario',
      _commenter_name || ' comentó en "' || COALESCE(_target_title, 'tu publicación') || '"',
      _link
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_comment();

-- Create notification trigger for new readers
CREATE OR REPLACE FUNCTION public.notify_new_reader()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _reader_name TEXT;
  _book_author_id UUID;
  _book_title TEXT;
BEGIN
  SELECT COALESCE(display_name, username, 'Alguien') INTO _reader_name
  FROM public.profiles WHERE id = NEW.user_id;

  SELECT author_id, title INTO _book_author_id, _book_title
  FROM public.books WHERE id = NEW.book_id;

  IF _book_author_id IS NOT NULL AND _book_author_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      _book_author_id,
      'new_reader',
      'Nuevo lector',
      _reader_name || ' comenzó a leer "' || COALESCE(_book_title, 'tu libro') || '"',
      '/book/' || NEW.book_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_reader
  AFTER INSERT ON public.reading_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_reader();

-- Create notification for new messages
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender_name TEXT;
  _participant RECORD;
BEGIN
  SELECT COALESCE(display_name, username, 'Alguien') INTO _sender_name
  FROM public.profiles WHERE id = NEW.sender_id;

  FOR _participant IN
    SELECT user_id FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      _participant.user_id,
      'message',
      'Nuevo mensaje',
      _sender_name || ': ' || LEFT(NEW.content, 50),
      '/chat/' || NEW.conversation_id
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();
