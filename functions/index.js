const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

async function sendToUser(userId, title, body, url) {
  const userSnap = await db.collection('users').doc(userId).get();
  const tokens = userSnap.data()?.fcmTokens || [];
  if (!tokens.length) return;

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: { url: url || '/react-migration/' },
    webpush: {
      fcmOptions: { link: url || '/react-migration/' },
    },
  });

  const badTokens = [];
  response.responses.forEach((r, i) => {
    if (!r.success) badTokens.push(tokens[i]);
  });
  if (badTokens.length) {
    await db.collection('users').doc(userId).update({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(...badTokens),
    });
  }
}

// Naya chat message aane par push
exports.onNewMessage = onDocumentCreated(
  'chats/{chatId}/messages/{messageId}',
  async (event) => {
    const msg = event.data.data();
    if (!msg || !msg.recipientId || msg.senderId === msg.recipientId) return;

    const senderSnap = await db.collection('users').doc(msg.senderId).get();
    const senderName = senderSnap.data()?.name || 'Someone';

    await sendToUser(
      msg.recipientId,
      senderName,
      msg.text ? msg.text.slice(0, 100) : 'Sent you a message',
      `/react-migration/chat/${msg.senderId}`
    );
  }
);

// Naya connection request aane par push
exports.onConnectionRequest = onDocumentCreated(
  'connections/{connectionId}',
  async (event) => {
    const conn = event.data.data();
    if (!conn || conn.status !== 'pending') return;

    const fromSnap = await db.collection('users').doc(conn.fromId).get();
    const fromName = fromSnap.data()?.name || 'Someone';

    await sendToUser(
      conn.toId,
      'New Connection Request',
      `${fromName} wants to connect with you`,
      '/react-migration/network'
    );
  }
);
