/* =====================================
   AUTO LABEL TABLE FOR MOBILE
   ===================================== */

document.addEventListener("DOMContentLoaded", () => {

  document.querySelectorAll("table").forEach(table => {

    const headers = [...table.querySelectorAll("thead th")]
      .map(th => th.innerText.trim());

    if(!headers.length) return;

    table.querySelectorAll("tbody tr").forEach(tr => {
      [...tr.children].forEach((td, i) => {
        if (headers[i]) {
          td.setAttribute("data-label", headers[i]);
        }
      });
    });

  });

});
