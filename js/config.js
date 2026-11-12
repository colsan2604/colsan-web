// ================== CONFIGURACIÓN DE COL-SAN ==================
//
// 1) FIREBASE (base de datos de citas y contenido de la página)
//    Pega aquí los datos de tu proyecto: Firebase > Configuración del proyecto > Tus apps > Web.
//    Si lo dejas vacío, la página funciona igual, pero guarda todo solo en el navegador de quien la usa.
export const FIREBASE = {
  apiKey: "AIzaSyAx8_fsCQc3u7YSO2oaKytYpb6N-aL7FA4",
  authDomain: "colsan-57f5f.firebaseapp.com",
  projectId: "colsan-57f5f",
  storageBucket: "colsan-57f5f.firebasestorage.app",
  messagingSenderId: "529550128414",
  appId: "1:529550128414:web:36ef2fcad57827ba8c050f",
  measurementId: "G-LWMJD345HB"
};

// 2) ACCESO AL MODO EDICIÓN
//    usuario: lo que se escribe en la ventana "Editar".
//    correo:  el usuario que creas en Firebase > Authentication (Correo/contraseña).
//             Su contraseña es la palabra colsan + tu PIN. Ejemplo: PIN 1234 -> contraseña colsan1234
//    pin:     SOLO se usa si Firebase está vacío. Con Firebase configurado, déjalo vacío ("")
//             porque este archivo lo puede ver cualquiera desde el navegador.
export const ADMIN = {
  usuario: "moni",
  correo: "moni@colsan.app",
  pin: ""
};
