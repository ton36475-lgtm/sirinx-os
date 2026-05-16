const yearStamp = document.querySelector("#yearStamp");

if (yearStamp) {
  yearStamp.textContent = `SIRINX company website - ${new Date().getFullYear()}`;
}
