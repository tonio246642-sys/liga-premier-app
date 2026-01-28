import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Inicializamos la App Admin si no existe
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "liga-futbol-sca",
      clientEmail: "firebase-adminsdk-fbsvc@liga-futbol-sca.iam.gserviceaccount.com",
      // REEMPLAZA LOS \n REALES POR TEXTO SI TE DA ERROR, PERO PEGALO TAL CUAL DEL JSON PRIMERO
      privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDZBX9gZOS/a6+Z\nr8gNU/DV16L4wejSr0Nx8QCR/dFxH9TftqXg+MbgGAHPFGOEjxRsChcvzYrHtBTx\njDhPAkOPhI8AxO6fRgfCBtuEbPApjU4CGk1MYEsDzPXOZaPQ8yc2DdHegPNjrrfX\nChsB8xPDNltilam91sdRzPiNvCc6A51r9AKoF9y+8E9oSaxPOt1UT8kRmw8lD0vZ\n6rhHUtFFO0Q5YohKBx4yMbRgXFFHqgxzgAVbu/dYBSUhjqRCQXLVt4zhn6X9KZb7\n/GGOIrWXAqpzrjd0rilbq4s1bpi2nZYGP2sxqlTi8YISu4qVqucfR/2fAerU9FjP\nEt8Mul8ZAgMBAAECggEAA0aLIiF+YbSWjWty9F81zYci2BNWgsY6GTWp1wpC3Ndo\np0nCni8oZ/Mkz9h/GgiY0SVOgp5dFQo5nghfmd2vDF2pVOR5X4u3Npf+PIpHuQYq\nImuoNVoSDR13q6UAFc7IYuSkLBy7z7Ta5H2BY9mkjOKR+t5xwJebIY0bm/QLjtto\n/ooKO1MoxccpoKpE3YV8dHL9CQYPvVForsOC9YfCBbrC4PZXVXq0GZIMnBzywT8r\n5LXBxR4b6ZF8P+gum3UY756D7oRFrmTcNBlE4yQnTWnqg92qrnJByylmRc6pGyTA\nuFBp4VyMQqP/T82vM5VqKdC1E+/aG/ZB2TLGFzz+wwKBgQDwGSq2Q0CjPYa0YSNX\ncforJ7hAKpgdZ0WXcFP+yzYAMZZ2YGnIBi14D25lfRB5weEU1W9aOOo1tcQH54Hc\nXoTx8eaVS7+zCoEqbaFslnrehKnr7t0Y8dXjfagcz9vNiNXzrMfJTHeIIFWsIQpZ\nE5IBLqadY3ufBcNPvvLjVpGSxwKBgQDnZRD1xdWEZvz5wGTIFg4xOGzhG7I3N9yY\n5DYiEuVVMwPX4g8lrSFnQwgacCgeNjjSCQqiiqyRMQ3gASF7P2LbBuWSbZP7Zvq9\n1MHKuCbiWviH4aMgSyG2CVsuw4lTnntzqUYQdnLznkQzKj3lIoaGH4HfZa9C7cPT\ngIsjsZCfHwKBgEQzYeaUA/BascDbNubIAX/wsG3Jq5vukd4KklF198jmTQ8jI+kl\nmBTajUlW1S9A22bHmfHO6PiIwT5djI3Ea48uX4lZEwMQoNAkhA4MUKqUlI/oMfW7\n/D26m95TTOR9Ugj9s2KCzhFk3fEfEYlr/bVIQxvB/oOVZ31niCb7mC5RAoGAd2yR\n9EbGjC8bIUtKuHmpmX2ltAi3UghisgYWaj+WXQKXWTQy3R8dvk26QOrhybXyXXSN\nKJapucW3g4UR4qo0Oxa0JX6ogXgEsTS9UAL7Dpgk7PxnVKNyIqFxjhEdLyr8TBVx\nM83uRg3I5R9IEppfE5nvTX0Nl11fVCljpmheW8ECgYEApIPPecA1k5fa8nRvbT1K\nvjNmMHvlnfpVmLLQtbIje7DffFxPCTqc7wBfdab8E/9/TowMZJWNThsVn+7Fzfdc\nEzpxC1F1ZHsYWe9Mf6o9hneAHe5Y/FBMc2XdhWeOwOMZ5WLvozaGFHulQ2ryAgIC\n99Ov+ZG6rg20zRZMZUaJ7IE=\n-----END PRIVATE KEY-----\n",
    }),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, message } = body;

    // 1. Obtener todos los tokens guardados
    const tokensSnap = await admin.firestore().collection('fcm_tokens').get();
    
    if (tokensSnap.empty) {
      return NextResponse.json({ success: false, message: 'No hay usuarios registrados' });
    }

    const tokens = tokensSnap.docs.map(doc => doc.data().token);

    // 2. Enviar notificación masiva
    const response = await admin.messaging().sendEachForMulticast({
      tokens: tokens,
      notification: {
        title: title || '¡Nueva Actualización!',
        body: message || 'Entra a la app para ver los detalles.',
      },
      webpush: {
        fcmOptions: {
          link: '/matches'
        }
      }
    });

    return NextResponse.json({ success: true, results: response });
  } catch (error) {
    console.error('Error enviando notificaciones:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}