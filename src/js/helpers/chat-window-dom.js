import throttle from 'lodash/throttle';
import Dom from './dom';
import Firebase from './firebase';
import config from '../../../config/index';

export default class ChatWindowDom extends Dom {
  constructor(html, domain, firebaseUser) {
    super();
    this.firebaseUser = firebaseUser;
    this.firebase = new Firebase();
    this.html = html;
    this.currentDomain = domain;
    this.globalDom = new Dom(document.querySelector('html'));
    this.messageArea = this.html.querySelector('.message-area');
    this.panelMessageArea = this.messageArea.querySelector('.panel');
    this.textArea = this.html.querySelector('#text-message-input');
    this.controlMessageInput = this.html.querySelector('.control.message-input');
    this.sendButton = this.controlMessageInput.querySelector('a.button');
    this.userAlert = this.html.querySelector('.notification-username');
    this.loginAlert = this.html.querySelector('.notification-login');
    this.loginControl = this.loginAlert.querySelector('.control');
    this.loginAlertInput = this.loginAlert.querySelector('input');
    this.loginAlertButton = this.loginAlert.querySelector('a.button');
    this.navbarUser = this.html.querySelector('.navbar-user');
    this.navbarUsername = this.navbarUser.querySelector('span');
    this.init();
  }

  async init() {
    // this.firebase.setEmailLinkListener()
    //   .then(response => this.triggerEmaiLinked(response))
    //   .catch(error => this.triggerEmailLinkError(error));

    this.textArea.focus();
    this.html
      .querySelector('.chat-toggle')
      .addEventListener('click', throttle(this.chatToggle.bind(this), 1000));
    this.html
      .querySelector('.pin-window')
      .addEventListener('click', this.togglePinned.bind(this));
    this.html
      .querySelector('.navbar-brand')
      .querySelector('span')
      .innerText = `Room: ${this.currentDomain}`;

    this.html
      .querySelector('#text-message-input')
      .addEventListener('input', this.processTextArea.bind(this));
    this.html
      .querySelector('#text-message-input')
      .addEventListener('keypress', this.onKeyPressed.bind(this));

    this.loginAlertInput
      .addEventListener('input', this.processLoginInput.bind(this));
    this.loginAlertInput
      .addEventListener('keypress', this.onLoginInputKeyPressed.bind(this));
    this.loginAlertButton
      .addEventListener('click', this.processLoginInput.bind(this));

    const { displayName } = this.firebaseUser;
    if (!displayName) {
      this.setChatDisabled({ reason: 'You must set a username first' });
    } else {
      this.username = displayName;
      this.html
        .querySelector('.navbar-user')
        .querySelector('span')
        .innerText = `Logged in as: ${displayName}`;
      this.setChatEnabled();
    }
    this.sendButton.addEventListener('click', this.processTextArea.bind(this));

    this.firebase.setMessageListener(({ status }) => {
      if (status === 'ok') {
        this.triggerEmailLinked(); 
      } else if (status === 'error') {
        this.triggerEmailLinkError();
      }
    });
  }

  chatToggle(event) {
    this.html.classList.toggle('visible');
    event.stopPropagation();
  }

  togglePinned(event) {
    this.html.classList.toggle('pinned');
    this.toggleGlobalMargin();
    event.stopPropagation();
  }

  toggleGlobalMargin() {
    if (!this.globalDom.globalRightMargin || this.globalDom.globalRightMargin === '0px') {
      return this.globalDom.globalRightMargin = 340;
    }
    return this.globalDom.globalRightMargin = 0;
  }

  async setUsername(username = null) {
    if (!username) return false;
    try {
      const response = await this.firebase.updateUserDisplayName(username);
      this.username = response.displayName;
    } catch (e) {
      console.error('Error setting username: ', e);
      return;
    }
  }

  setChatDisabled({ reason }) {
    this.chatEnabled = false;
    this.textArea.rows = 1;
    this.textArea.setAttribute('maxlength', '24');
  }

  setChatEnabled() {
    this.chatEnabled = true;
    this.userAlert.style.display = 'none';
    this.sendButton.innerText = 'Send';
    this.textArea.placeholder = 'Write a message...';
    this.textArea.setAttribute('maxlength', '600');
    this.textArea.rows = 2;
    this.textArea.focus();

    if (!this.firebaseUser.email) {
      this.loginAlert.style.display = 'block';
    }
  }

  addMessageToList(message = null, author = null) {
    if (!message || !author) return;
    const newMessage = document.createElement('div');
    newMessage.classList.add('panel-block');
    newMessage.innerText = `${author}: ${message}`;
    this.panelMessageArea.appendChild(newMessage);
    this.panelMessageArea.scrollTo(0, this.panelMessageArea.scrollHeight);
  }

  sendMessageButtonPressed(event = null) {
    this.sendMessage(this.textArea.value);
  }

  sendMessage(message = null) {
    if (!message) return;
    this.addMessageToList(message, this.username);
  }

  async tryUsername(username = null) {
    if (!username) return;

    await this.setUsername(username);
    this.controlMessageInput.classList.remove('is-loading');
    this.textArea.disabled = false;
    this.sendButton.removeAttribute('disabled');
    this.setChatEnabled();
  }

  clearTextAreaOnEnter(event) {
    event.stopPropagation();
    event.preventDefault();
    this.textArea.value = '';
    this.textArea.focus();
  }

  checkUsername(username = null) {
    if (username === '') return true;
    return /^[0-9a-zA-Z_.-]+$/.test(username);
  }

  setMessageInputStatus(isUsernameValid = false) {
    if (!isUsernameValid) {
      this.textArea.classList.add('is-danger');
    } else {
      this.textArea.classList.remove('is-danger');
    }
  }

  processTextArea(event) {
    if (!this.chatEnabled) {
      const isUsernameValid = this.checkUsername(this.textArea.value);
      this.setMessageInputStatus(isUsernameValid);
    }
    
    if ((event.type === 'click') && (!this.chatEnabled)) {
      this.controlMessageInput.classList.add('is-loading');
      this.textArea.disabled = true;
      this.sendButton.setAttribute('disabled', true);
      console.log('Setting username: ' + this.textArea.value);
      this.tryUsername(this.textArea.value);
      this.clearTextAreaOnEnter(event);
    } else if ((event.type === 'click') && (this.chatEnabled)) {
      console.log('Sending message: ', this.textArea.value);
      this.sendMessage(this.textArea.value);
      this.clearTextAreaOnEnter(event);
    }
  }

  onKeyPressed(event) {
    const code = (event.keyCode ? event.keyCode : event.which);
    if ((code === 13) && (!this.chatEnabled)) {
      this.controlMessageInput.classList.add('is-loading');
      this.textArea.disabled = true;
      this.sendButton.setAttribute('disabled', true);
      console.log('Setting username: ' + this.textArea.value);
      this.tryUsername(this.textArea.value);
      this.clearTextAreaOnEnter(event);
    } else if ((code === 13) && (this.chatEnabled)) {
      console.log('Sending message: ', this.textArea.value);
      this.sendMessage(this.textArea.value);
      this.clearTextAreaOnEnter(event);
    }
  }

  checkEmail(email = null) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }

  async tryLogin(email = null) {
    if (!email) return false;
    this.loginControl.classList.add('is-loading');
    this.loginAlertInput.disabled = true;
    this.loginAlertButton.setAttribute('disabled', true);
    const response = await this.firebase.signInWithEmailLink(email);
    if (response) {
      this.loginAlert.querySelector('.form-wrap').remove();
      this.loginAlert.innerText = `Check your email inbox :)`;
    }
  }

  processLoginInput(event) {
    const isEmailValid = this.checkEmail(this.loginAlertInput.value);
    if (!isEmailValid && this.loginAlertInput.value !== '') {
      this.loginAlertInput.classList.add('is-danger');
      this.loginAlertButton.setAttribute('disabled', true);
    } else if (isEmailValid) {
      this.loginAlertInput.classList.remove('is-danger');
      this.loginAlertButton.removeAttribute('disabled');
    } else if (this.loginAlertInput.value === '') {
      this.loginAlertButton.setAttribute('disabled', true);
      this.loginAlertInput.classList.remove('is-danger');
    }

    if ((event.type === 'click') && (isEmailValid)) {
      this.tryLogin(this.loginAlertInput.value);
    }
  }

  onLoginInputKeyPressed(event) {
    const code = (event.keyCode ? event.keyCode : event.which);
    const isEmailValid = this.checkEmail(this.loginAlertInput.value);

    if ((code === 13) && (isEmailValid)) {
      this.tryLogin(this.loginAlertInput.value);
    }
  }

  triggerEmailLinked(response) {
    this.loginAlert.remove();
    const isOurLanding = (window.location.href.includes(config.firebase.hosting.domain)) ?
      true :
      false;
    if (isOurLanding) {
      const background = document.querySelector('#page-wrapper');
      const text = document.querySelector('.hero');
      const loader = document.querySelector('.loader');

      loader.remove();
      text.innerText = 'Signed In!';
      background.style.transition = 'background-color 500ms linear';
      background.style.backgroundColor = '#29b956';
    }

    if (!this.chatEnabled) {
      this.chatEnabled = true;
      this.setChatEnabled();
    }
  }

  triggerEmailLinkError(error) {
    this.loginAlertInput.classList.remove('is-loading');
    this.loginAlertInput.classList.add('is-danger');
    this.loginAlertInput.disabled = false;
    this.loginAlertButton.removeAttribute('disabled');

    const isOurLanding = (window.location.href.includes(config.firebase.hosting.domain)) ?
      true :
      false;
    if (isOurLanding) {
      const background = document.querySelector('#page-wrapper');
      const text = document.querySelector('.hero');
      const loader = document.querySelector('.loader');

      loader.remove();
      text.innerText = 'An error has occured :( Please try again later';
      background.style.transition = 'background-color 500ms linear';
      background.style.backgroundColor = '#ce6270';
    }
  }
}