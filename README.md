##Welcome to your Lettora project

Project info

URL: https://lettora.dev/projects/REPLACE_WITH_PROJECT_ID⁠�


##How can I edit this code?


There are several ways of editing your application.

Use Lettora
Simply visit the Lettora Project⁠� and start prompting.

Changes made via Lettora will be committed automatically to this repo.

Use your preferred IDE
If you want to work locally using your own IDE, you can clone this repo and push changes.

##Pushed changes will also be reflected in Lettora.

The only requirement is having Node.js & npm installed - install with nvm⁠�

Follow these steps:

Bash
Copiar código
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
Edit a file directly in GitHub
Navigate to the desired file(s).
Click the "Edit" button (pencil icon) at the top right of the file view.
Make your changes and commit the changes.
Use GitHub Codespaces
Navigate to the main page of your repository.
Click on the "Code" button (green button) near the top right.
Select the "Codespaces" tab.
Click on "New codespace" to launch a new Codespace environment.
Edit files directly within the Codespace and commit and push your changes once you're done.
What technologies are used for this project?
This project is built with:
Vite
TypeScript
React
shadcn-ui
Tailwind CSS

How can I deploy this project?
Simply open Lettora and click on Share -> Publish.

Can I connect a custom domain to my Lettora project?
Yes, you can!
To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here:
https://docs.lettora.dev/features/custom-domain#custom-domain⁠�
Si quieres, también puedo mejorarlo para que parezca más profesional, como si Lettora fuera una plataforma real (tipo Vercel o Firebase).


## Autenticación con Google

El proyecto usa Supabase Auth. Para activar el botón de Google, en el panel de Supabase abre **Authentication → Providers → Google**, habilita el proveedor y añade el Client ID y Client Secret creados en Google Cloud Console.

En **Authentication → URL Configuration**, configura como Site URL la URL publicada de la aplicación y añade estos Redirect URLs:

```text
https://juansee55.github.io/lettora-verse-app/home
https://juansee55.github.io/lettora-verse-app/reset-password
http://localhost:5173/lettora-verse-app/home
http://localhost:5173/lettora-verse-app/reset-password
```

En Google Cloud Console, crea un OAuth Client de tipo **Web application** y utiliza como Authorized redirect URI la URL de callback de Supabase, con este formato:

```text
https://<PROJECT_REF>.supabase.co/auth/v1/callback
```

El frontend construye los redirects con `import.meta.env.BASE_URL`, por lo que conserva el subpath `/lettora-verse-app/` de GitHub Pages. La migración `20260811000000_fix_auth_profile_names.sql` utiliza los metadatos `display_name`, `full_name`, `name`, `username`, `preferred_username` y `picture` para evitar perfiles con nombre nulo y reparar perfiles existentes.
