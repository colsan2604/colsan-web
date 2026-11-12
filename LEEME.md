# Consultorio Dental COL-SAN · Página web

Página lista para subir a **GitHub** y publicar con **Vercel**. Las citas y el contenido se guardan en **Firebase**.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La página |
| `css/estilos.css` | Colores, bordes plateados y animaciones |
| `js/app.js` | Funcionamiento (reservas, edición, WhatsApp) |
| `js/config.js` | **Aquí pegas tu Firebase y cambias usuario/PIN** |
| `assets/` | Logos |
| `firestore.rules` | Reglas de seguridad para Firebase |

## 1. Crear la base de datos en Firebase (una sola vez)

1. Entra a <https://console.firebase.google.com> y crea un proyecto (por ejemplo `colsan`).
2. **Firestore Database** → *Crear base de datos* → modo producción → ubicación `southamerica-east1`.
3. **Firestore → Reglas**: borra todo, pega el contenido de `firestore.rules` y pulsa *Publicar*.
4. **Authentication** → *Comenzar* → activa **Correo electrónico/contraseña**.
   - Pestaña *Usuarios* → *Agregar usuario*:
     - Correo: `moni@colsan.app`
     - Contraseña: `colsan1234` (la palabra *colsan* + el PIN)
5. **Configuración del proyecto** (⚙️) → *Tus apps* → icono `</>` (Web) → registra la app → copia el objeto `firebaseConfig`.
6. Abre `js/config.js` y pega esos valores dentro de `FIREBASE`.

> Para cambiar el PIN: cámbialo en `js/config.js` **y** cambia la contraseña del usuario en Authentication (`colsan` + nuevo PIN).

## 2. Subir a GitHub

1. Crea un repositorio nuevo en <https://github.com/new> (por ejemplo `colsan-web`).
2. Pulsa *uploading an existing file* y arrastra **todo el contenido** de esta carpeta (no la carpeta, su contenido).
3. Pulsa *Commit changes*.

## 3. Publicar con Vercel

1. Entra a <https://vercel.com> con tu cuenta de GitHub.
2. *Add New → Project* → elige `colsan-web` → *Deploy* (no cambies nada).
3. Cada vez que subas cambios a GitHub, Vercel actualiza la página sola.

## 4. Editar la página

- Pulsa el **candado** arriba a la derecha → usuario `moni`, PIN `1234`. Con Firebase configurado, deja `pin: ""` en `js/config.js`: el PIN lo verifica Firebase.
- Toca cualquier texto o logo para cambiarlo directamente.
- **Panel** → Datos, Imágenes, Frases, Tratamientos, Promociones, Especialistas, Horarios y Citas.
- Pulsa **Guardar** para publicar los cambios.
- En **Citas** puedes confirmar, cancelar (libera el horario), escribir al paciente por WhatsApp y descargar la lista en Excel.

## Notas

- Los horarios se escriben como `08:30 - 12:30`; así la página calcula si está ABIERTO o CERRADO y qué horas de cita ofrecer.
- Para que el mapa sea exacto, en *Panel → Datos → Ubicación del mapa* pega la dirección con la ciudad o las coordenadas de Google Maps.
- Si Firebase no está configurado, la página funciona igual, pero todo se guarda solo en el navegador de quien la usa.
- Fotos de portada: Unsplash (Ozkan Guner, Shedrack Salami, Katsiaryna Endruszkiewicz). Puedes reemplazarlas desde el panel.
