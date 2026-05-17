// ========================================
// PERSONAL PRO — WhatsApp Integration
// ========================================

/**
 * Gera link wa.me com mensagem pré-preenchida
 * @param {string} phone - Telefone (será limpo)
 * @param {string} message - Mensagem
 * @returns {string} URL do WhatsApp
 */
export function waLink(phone, message) {
  const clean = String(phone || '').replace(/\D/g, '');
  const num = clean.length <= 11 ? '55' + clean : clean;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

/** Abre o WhatsApp com mensagem pré-preenchida */
export function sendWhatsApp(phone, message) {
  window.open(waLink(phone, message), '_blank');
}

/** Lembrete de treino */
export function reminderMsg(studentName, workoutName, date, time, formLink = '') {
  let msg = `🏋️ *Personal PRO*\n\n`;
  msg += `Olá ${studentName}! 👋\n\n`;
  msg += `📅 Lembrete de treino:\n`;
  msg += `• *${workoutName}*\n`;
  msg += `• ${date} às ${time}\n\n`;
  if (formLink) msg += `📝 Preencha o pré-treino antes da sessão:\n${formLink}\n\n`;
  msg += `Bom treino! 💪`;
  return msg;
}

/** Formulário pré-treino */
export function preFormMsg(studentName, formLink) {
  return `🏋️ *Personal PRO*\n\nOlá ${studentName}! 👋\n\n📝 Por favor preencha o formulário pré-treino (leva 30 segundos):\n${formLink}\n\nIsso nos ajuda a ajustar o treino de hoje. Obrigado! 🙏`;
}

/** Formulário pós-treino */
export function postFormMsg(studentName, formLink) {
  return `🏋️ *Personal PRO*\n\nParabéns pelo treino, ${studentName}! 🎉\n\n📝 Por favor avalie como foi o treino (PSE):\n${formLink}\n\nSeus dados ajudam no seu progresso! 📊💪`;
}

/** Cobrança de mensalidade */
export function paymentMsg(studentName, amount, dueDate) {
  return `🏋️ *Personal PRO*\n\nOlá ${studentName}! 👋\n\n💰 Lembrete de pagamento:\n• Valor: R$ ${Number(amount).toFixed(2)}\n• Vencimento: ${dueDate}\n\nQualquer dúvida estou à disposição. 🙏`;
}

/** Hook React para usar WhatsApp facilmente nos componentes */
export function useWhatsApp() {
  return { sendWhatsApp, reminderMsg, preFormMsg, postFormMsg, paymentMsg, waLink };
}
