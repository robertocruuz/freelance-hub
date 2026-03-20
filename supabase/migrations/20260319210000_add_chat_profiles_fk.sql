-- Add missing foreign keys for the chat system to allow native PostgREST joins to the profiles table
ALTER TABLE public.channel_members 
ADD CONSTRAINT fk_channel_members_profile 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

ALTER TABLE public.messages 
ADD CONSTRAINT fk_messages_profile 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;
