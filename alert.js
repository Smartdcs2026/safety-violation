window.AppAlert = Swal.mixin({
  width: 320,
  padding: '18px',
  buttonsStyling: false,
  allowOutsideClick: false,
  customClass: {
    popup: 'sv-swal-popup',
    title: 'sv-swal-title',
    htmlContainer: 'sv-swal-content',
    confirmButton: 'sv-swal-confirm',
    cancelButton: 'sv-swal-cancel',
    actions: 'sv-swal-actions'
  }
});
