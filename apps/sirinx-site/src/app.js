const buildStamp = document.querySelector("#buildStamp");
const readyItems = document.querySelectorAll('.check-row[data-ready="true"]').length;
const pendingItems = document.querySelectorAll('.check-row[data-ready="pending"]').length;

if (buildStamp) {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok"
  }).format(new Date());

  buildStamp.textContent = `Production check: ${readyItems} ready, ${pendingItems} blocking - ${formatted}`;
}
