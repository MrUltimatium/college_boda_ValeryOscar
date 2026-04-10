const SUPABASE_URL = "https://rrsmohumucggcshfjpiq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_epHx5z8BFiC7TpKJmWlP5g_l_w_HWTG";
const BUCKET = "boda-fotos";
const FOLDER = "galeria";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const uploadForm = document.getElementById("upload-form");
const photoInput = document.getElementById("photo-input");
const previewList = document.getElementById("preview-list");
const formStatus = document.getElementById("form-status");
const submitButton = document.getElementById("submit-button");
const refreshButton = document.getElementById("refresh-button");
const gallery = document.getElementById("gallery");
const galleryMeta = document.getElementById("gallery-meta");
const photoCardTemplate = document.getElementById("photo-card-template");

const formatPhotoCount = (count) => {
  if (count === 1) return "Un recuerdo compartido";
  return `${count} recuerdos compartidos`;
};

const setStatus = (message, isError = false) => {
  formStatus.textContent = message;
  formStatus.style.color = isError ? "#9b3d2f" : "";
};

const renderPreviews = () => {
  previewList.innerHTML = "";

  if (!photoInput.files.length) return;

  Array.from(photoInput.files).forEach((file) => {
    const chip = document.createElement("div");
    chip.className = "preview-chip";
    chip.textContent = `${file.name} • ${Math.round(file.size / 1024)} KB`;
    previewList.appendChild(chip);
  });
};

const renderGallery = (photos) => {
  gallery.innerHTML = "";

  if (!photos.length) {
    gallery.innerHTML = `
      <div class="empty-state">
        <p>Todavía no hay fotos en el mural. Sé la primera persona en compartir un recuerdo.</p>
      </div>
    `;
    galleryMeta.textContent = "Aún no hay recuerdos publicados.";
    return;
  }

  const fragment = document.createDocumentFragment();

  photos.forEach((photo) => {
     const card = photoCardTemplate.contentEditable.firstElementChild.cloneNode(true);
     const image = card.querySelector("img");
     image.src = photo.url;
     image.alt = "Foto compartida por invitados de la boda";
     fragment.appendChild(card);
  });

  gallery.appendChild(fragment);
  galleryMeta.textContent = `${formatPhotoCount(photos.length)} en el collage.`;
};

const safeFileName = (fileName) => {
  return fileName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-");
};

const loadGallery = async () => {
  galleryMeta.textContent = "Actualizando mural...";

  const { data, error } = await supabaseClient.storage
    .from(BUCKET)
    .list(FOLDER, {
      limit: 200,
      sortBy: { column: "name", order: "desc" }
    });
  
  if (error) {
    gallery.innerHTML = `
      <div class="empty-state">
        <p>No fue posible cargar el mural en este momento.</p>
      </div>
    `;
    galleryMeta.textContent = "Error al cargar las fotos.";
    return;
  }

  const photos = (data || [])
    .filter((item) => item.name)
    .map((item) => {
      const path = `${FOLDER}/${item.name}`;
      const response = supabaseClient.storage.from(BUCKET).getPublicUrl(path);

      return {
        id: item.id || item.name,
        url: response.data.publicUrl,
        name: item.name
      };
    });

  renderGallery(photos);
};

photoInput.addEventListener("change", renderPreviews);

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const files = Array.from(photoInput.files);

  if (!files.length) {
    setStatus("Selecciona al menos una foto antes de subirla.", true);
    return;
  }

  submitButton.disabled = true;
  setStatus("Subiendo fotos al mural...");

  try {
    for (const file of files){
      const fileName = `${Date.now()}-${safeFileName(file.name)}`;
      const filePath = `${FOLDER}/${fileName}`;

      const { error } = await supabaseClient.storage
        .from(BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false
        });

      if (error) 
        throw error;
    }

    photoInput.value = "";
    renderPreviews();
    setStatus("Tus fotos ya forman parte del collage");
    await loadGallery();
  }
  catch (error) {
    setStatus(error.message || "Ocurrió un error al subir las fotos.", true);
  }
  finally {
    submitButton.disabled = false;
  }
});

refreshButton.addEventListener("click", loadGallery);

loadGallery();
setInterval(loadGallery, 12000);