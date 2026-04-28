const businessName = document.querySelector("#businessName");
const form = document.querySelector("#reviewForm");
const submitButton = document.querySelector("#submitButton");
const statusMessage = document.querySelector("#statusMessage");

const businessId = window.location.pathname.split("/").filter(Boolean).at(-1);

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

async function loadBusiness() {
  if (!businessId || businessId === "r") {
    businessName.textContent = "Negocio no configurado";
    form.hidden = true;
    return;
  }

  const response = await fetch(`/api/businesses/${businessId}`);
  if (!response.ok) {
    businessName.textContent = "Negocio no encontrado";
    form.hidden = true;
    return;
  }

  const business = await response.json();
  businessName.textContent = business.name;
  document.title = `Resena rapida - ${business.name}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const rating = formData.get("rating");

  if (!rating) {
    setStatus("Elige una puntuacion antes de enviar.", true);
    return;
  }

  submitButton.disabled = true;
  setStatus("Guardando respuesta...");

  try {
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        businessId,
        rating: Number(rating),
        comment: formData.get("comment")
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "No se pudo enviar la respuesta");
    }

    setStatus(result.message || "Gracias por tu respuesta.");
    form.reset();

    if (result.redirectUrl) {
      setTimeout(() => {
        window.location.href = result.redirectUrl;
      }, 900);
    }
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    submitButton.disabled = false;
  }
});

loadBusiness().catch(() => {
  businessName.textContent = "No se pudo cargar el negocio";
  form.hidden = true;
});
