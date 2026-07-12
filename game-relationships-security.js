import { ITEMS } from "./game-shared.js";

export function escapeSocialHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function installRelationshipSecurity(GameClass) {
  const proto = GameClass.prototype;

  proto.openSocialMailbox = function openSocialMailboxSecure() {
    const letters = [...(this.state.social?.letters || [])].sort((a, b) => b.day - a.day || String(a.id).localeCompare(String(b.id)));
    this.socialMailboxView = letters.map((letter) => letter.id);
    const unread = letters.filter((letter) => !letter.read).length;
    const html = letters.length ? letters.map((letter, index) => {
      const buttonLabel = letter.read ? (letter.reward && !letter.claimed ? "Claim" : "Read Again") : "Open";
      return `<article class="social-letter ${letter.read ? "read" : "unread"}"><div><strong>${letter.read ? "✉️" : "📨"} ${escapeSocialHtml(letter.subject)}</strong><small>From ${escapeSocialHtml(letter.from)} · Day ${Math.max(1, Math.floor(Number(letter.day) || 1))}</small></div><button data-social-letter-index="${index}">${buttonLabel}</button></article>`;
    }).join("") : "<p>The mailbox is empty.</p>";
    this.openModal("Farmstead Mailbox", `<p>${unread} unread letter${unread === 1 ? "" : "s"}.</p><div class="social-mail-list">${html}</div>`, [{ label: "Close", action: () => this.closeModal() }]);
    document.querySelectorAll("[data-social-letter-index]").forEach((button) => {
      button.onclick = () => {
        const id = this.socialMailboxView?.[Number(button.dataset.socialLetterIndex)];
        if (id) this.openSocialLetter(id);
      };
    });
  };

  proto.openSocialLetter = function openSocialLetterSecure(id) {
    const letter = this.state.social?.letters?.find((entry) => entry.id === id);
    if (!letter) return;
    letter.read = true;
    const reward = letter.reward && !letter.claimed ? letter.reward : null;
    const rewardParts = [];
    if (reward?.coins > 0) rewardParts.push(`${Math.floor(reward.coins)} coins`);
    if (reward?.item && ITEMS[reward.item]) rewardParts.push(`${ITEMS[reward.item].icon} ${escapeSocialHtml(ITEMS[reward.item].name)} ×${Math.max(1, Math.floor(Number(reward.amount) || 1))}`);
    const rewardText = rewardParts.length ? `<p><strong>Enclosed:</strong> ${rewardParts.join(" · ")}</p>` : "";
    const body = escapeSocialHtml(letter.body).replaceAll("\n", "<br>");
    const actions = [];
    if (reward) actions.push({ label: "Claim Enclosure", action: () => this.claimSocialLetter(id) });
    actions.push({ label: "Back to Mailbox", action: () => { this.closeModal(); this.openSocialMailbox(); } });
    actions.push({ label: "Close", action: () => this.closeModal() });
    this.openModal(String(letter.subject || "Letter"), `<p><em>From ${escapeSocialHtml(letter.from)}</em></p><p>${body}</p>${rewardText}`, actions);
    this.saveGame?.(true);
  };
}
