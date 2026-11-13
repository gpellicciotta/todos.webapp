/**
 * Enhance an existing row with an in-place question, restoring its content on either answer.
 * Hooks: content, trigger, question (`data-inline-confirm`), and answer (`yes` or `no`).
 * The caller owns the operation in onConfirm; destroy restores the row and removes listeners.
 */
export function attachInlineConfirm(element, options = {}) {
    const content = element.querySelector('[data-inline-confirm-content]');
    const question = element.querySelector('[data-inline-confirm]');
    const trigger = element.querySelector('[data-inline-confirm-trigger]');
    let asking = false;
    function restore() {
        question.hidden = true;
        content.hidden = false;
        if (asking) {
            trigger.focus();
        }
        asking = false;
    }
    function ask() {
        asking = true;
        content.hidden = true;
        question.hidden = false;
        question.setAttribute('tabindex', '-1');
        question.focus();
    }
    function onClick(event) {
        const answer = event.target.closest('[data-inline-confirm-answer]');
        if (!asking || !answer || !question.contains(answer)) {
            return;
        }
        restore();
        if (answer.dataset.inlineConfirmAnswer === 'yes') {
            options.onConfirm?.();
        }
        else {
            options.onCancel?.();
        }
    }
    function onKeydown(event) {
        if (asking && event.key === 'Escape' && !event.defaultPrevented) {
            event.preventDefault();
            restore();
            options.onCancel?.();
        }
    }
    trigger.addEventListener('click', ask);
    question.addEventListener('click', onClick);
    question.addEventListener('keydown', onKeydown);
    restore();
    return {
        destroy() {
            restore();
            trigger.removeEventListener('click', ask);
            question.removeEventListener('click', onClick);
            question.removeEventListener('keydown', onKeydown);
        }
    };
}
