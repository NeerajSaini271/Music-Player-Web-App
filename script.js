console.log("NKS MusicPlayer initialized");

const currentSongs = new Audio();

// NKS seekbar readiness
currentSongs.addEventListener("loadedmetadata", () => {
  requestAnimationFrame(() => {
    document.querySelector(".seekbar")?.classList.add("seekbar-ready");
  });
});

let songs = [];
let currFolder = "";
let currentSongIndex = -1;
let currentTrack = "";
let lastVolume = Number(localStorage.getItem("nksMusicPlayerVolume")) || 0.75;

const PLAYER_STATE_KEY = "nksMusicPlayerState";

function getSavedPlayerState() {
  try {
    return JSON.parse(localStorage.getItem(PLAYER_STATE_KEY));
  } catch {
    return null;
  }
}

function savePlayerState() {
  if (!currFolder || !currentTrack) {
    return;
  }

  const state = {
    folder: currFolder,
    track: currentTrack,
    index: currentSongIndex,
    time: currentSongs.currentTime || 0,
  };

  localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(state));
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${minutes.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

function updateSongListIcons() {
  const songItems = document.querySelectorAll(".songList li");

  songItems.forEach((item, index) => {
    const icon = item.querySelector(".song-play-icon");

    if (!icon) {
      return;
    }

    const itemTrack = songs[index];
    const isCurrentTrack =
      itemTrack === currentTrack && index === currentSongIndex;
    const isPlaying = isCurrentTrack && !currentSongs.paused;

    icon.src = isPlaying ? "img/pause.svg" : "img/play-rounded-max.svg";
    icon.alt = isPlaying ? "Pause song" : "Play song";
  });
}

function updateMainPlayIcon() {
  const playButton = document.querySelector("#play");

  if (!playButton) {
    return;
  }

  playButton.src = currentSongs.paused ? "img/play.svg" : "img/pause.svg";
}

async function getSongs(folder) {
  currFolder = folder;

  const request = await fetch(`${folder}/info.json`);

  if (!request.ok) {
    throw new Error(`Could not load ${folder}/info.json`);
  }

  const response = await request.json();
  songs = response.songs || [];

  const songList = document.querySelector(".songList ul");
  songList.innerHTML = "";

  songs.forEach((song, index) => {
    const songItem = document.createElement("li");

    songItem.innerHTML = `
      <img src="img/music.svg" alt="" />
      <div class="info">
        <div>${decodeURIComponent(song)}</div>
        <div>Artist</div>
      </div>
      <div class="playnow">
        <img
          class="song-play-icon"
          src="img/play-rounded-max.svg"
          alt="Play song"
        />
      </div>
    `;

    songItem.addEventListener("click", async () => {
      const isLoadedTrack = currentTrack === song && currentSongIndex === index;

      if (isLoadedTrack) {
        if (currentSongs.paused) {
          await currentSongs.play();
        } else {
          currentSongs.pause();
        }

        return;
      }

      playMusic(song, false, index);
    });

    songList.appendChild(songItem);
  });

  updateSongListIcons();

  return songs;
}

function playMusic(track, pause = false, index = 0) {
  if (!track) {
    return;
  }

  const isSameLoadedTrack =
    currentTrack === track && currentSongIndex === index && currentSongs.src;

  currentTrack = track;
  currentSongIndex = index;

  if (!isSameLoadedTrack) {
    currentSongs.src = `${currFolder}/${track}`;
  }

  document.querySelector(".songinfo-text").textContent =
    decodeURIComponent(track);
  document.querySelector(".songtime").textContent = "00:00 / 00:00";

  if (pause) {
    currentSongs.pause();
    updateMainPlayIcon();
    updateSongListIcons();
    return;
  }

  currentSongs
    .play()
    .catch((error) => console.error("Playback failed:", error));
}

async function displayAlbums() {
  const request = await fetch("albums.json");

  if (!request.ok) {
    throw new Error("Could not load albums.json");
  }

  const albumFolders = await request.json();
  const cardContainer = document.querySelector(".cardContainer");

  const albumCards = await Promise.all(
    albumFolders.map(async (folder) => {
      const metadataRequest = await fetch(`songs/${folder}/info.json`);

      if (!metadataRequest.ok) {
        console.error(`Could not load metadata for ${folder}`);
        return "";
      }

      const metadata = await metadataRequest.json();

      return `
        <div data-folder="${folder}" class="card">
          <div class="play">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient
                  id="albumPlayGradient-${folder.replace(/[^a-zA-Z0-9]/g, "")}"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop offset="0%" stop-color="#8b5cf6" />
                  <stop offset="100%" stop-color="#22d3ee" />
                </linearGradient>
              </defs>

              <circle
                cx="24"
                cy="24"
                r="24"
                fill="url(#albumPlayGradient-${folder.replace(
                  /[^a-zA-Z0-9]/g,
                  "",
                )})"
              />

              <path
                d="M19 16L19 32L33 24L19 16Z"
                fill="#0b0b10"
              />
            </svg>
          </div>

          <img
            src="songs/${folder}/${metadata.cover}"
            alt="${metadata.title}"
            onerror="this.onerror=null; this.src='img/logo.svg'"
          />

          <h2>${metadata.title}</h2>
          <p>${metadata.description}</p>
        </div>
      `;
    }),
  );

  // Render all albums once after every metadata file is ready.
  cardContainer.innerHTML = albumCards.join("");

  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", async () => {
      const folder = card.dataset.folder;

      currentSongs.pause();
      currentTrack = "";
      currentSongIndex = -1;

      songs = await getSongs(`songs/${folder}`);

      if (songs.length > 0) {
        playMusic(songs[0], false, 0);
      }
    });
  });
}

function updateVolumeProgress() {
  const volumeSlider = document.querySelector('.range input[type="range"]');

  volumeSlider.style.setProperty(
    "--volume-progress",
    `${currentSongs.volume * 100}%`,
  );
}

function updateVolumeIcon() {
  const volumeIcon = document.querySelector(".volume > img");

  if (currentSongs.volume === 0) {
    volumeIcon.src = "img/volume-mute.svg";
  } else if (currentSongs.volume < 0.3) {
    volumeIcon.src = "img/volume-low.svg";
  } else if (currentSongs.volume < 0.7) {
    volumeIcon.src = "img/volume-half.svg";
  } else {
    volumeIcon.src = "img/volume-full.svg";
  }
}

async function main() {
  const savedState = getSavedPlayerState();

  const albumsRequest = await fetch("albums.json");

  if (!albumsRequest.ok) {
    throw new Error("Could not load albums.json");
  }

  const albumFolders = await albumsRequest.json();

  if (albumFolders.length === 0) {
    throw new Error("No albums are available.");
  }

  const defaultFolder = `songs/${albumFolders[0]}`;

  const savedFolderName = savedState?.folder?.replace(/^songs\//, "");

  const savedFolderExists =
    savedFolderName && albumFolders.includes(savedFolderName);

  const initialFolder = savedFolderExists ? savedState.folder : defaultFolder;

  if (!savedFolderExists) {
    localStorage.removeItem(PLAYER_STATE_KEY);
  }

  songs = await getSongs(initialFolder);
  if (songs.length > 0) {
    let initialIndex = 0;

    if (savedState?.track) {
      const savedIndex = songs.indexOf(savedState.track);

      if (savedIndex >= 0) {
        initialIndex = savedIndex;
      }
    }

    const initialTrack = songs[initialIndex];

    currentSongs.addEventListener(
      "loadedmetadata",
      () => {
        if (savedState?.time > 0 && Number.isFinite(currentSongs.duration)) {
          const restoredTime = Math.min(
            savedState.time,
            Math.max(0, currentSongs.duration - 0.1),
          );

          currentSongs.currentTime = restoredTime;

          const progress = (restoredTime / currentSongs.duration) * 100;

          const seekbar = document.querySelector(".seekbar");

          seekbar.style.setProperty("--progress", `${progress}%`);

          seekbar.style.setProperty("--hover-position", `${progress}%`);

          document.querySelector(".circle").style.left = `${progress}%`;

          document.querySelector(".songtime").textContent =
            `${formatTime(restoredTime)} / ` +
            `${formatTime(currentSongs.duration)}`;
        }
      },
      { once: true },
    );

    playMusic(initialTrack, true, initialIndex);
  }

  await displayAlbums();

  const playButton = document.querySelector("#play");
  const previousButton = document.querySelector("#previous");
  const nextButton = document.querySelector("#next");
  const volumeSlider = document.querySelector('.range input[type="range"]');
  const volumeIcon = document.querySelector(".volume > img");

  playButton.addEventListener("click", async () => {
    if (!currentSongs.src) {
      return;
    }

    if (currentSongs.paused) {
      await currentSongs.play();
    } else {
      currentSongs.pause();
    }
  });

  currentSongs.addEventListener("play", () => {
    updateMainPlayIcon();
    updateSongListIcons();
    savePlayerState();
  });

  currentSongs.addEventListener("pause", () => {
    updateMainPlayIcon();
    updateSongListIcons();
    savePlayerState();
  });

  currentSongs.addEventListener("timeupdate", () => {
    const progress = currentSongs.duration
      ? (currentSongs.currentTime / currentSongs.duration) * 100
      : 0;

    document.querySelector(".songtime").textContent =
      `${formatTime(currentSongs.currentTime)} / ` +
      `${formatTime(currentSongs.duration)}`;

    const seekbar = document.querySelector(".seekbar");

    seekbar.style.setProperty("--progress", `${progress}%`);
    document.querySelector(".circle").style.left = `${progress}%`;
    savePlayerState();
  });

  const seekbar = document.querySelector(".seekbar");
  const seekTooltip = document.querySelector(".seek-tooltip");
  const progressCircle = document.querySelector(".circle");

  let isSeeking = false;

  function getSeekPercent(event) {
    const rect = seekbar.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;

    return Math.min(100, Math.max(0, (pointerX / rect.width) * 100));
  }

  function updateSeekPosition(event) {
    if (!currentSongs.duration) {
      return;
    }

    const percent = getSeekPercent(event);
    const newTime = (currentSongs.duration * percent) / 100;

    seekbar.style.setProperty("--progress", `${percent}%`);

    seekbar.style.setProperty("--hover-position", `${percent}%`);

    progressCircle.style.left = `${percent}%`;
    seekTooltip.style.left = `${percent}%`;
    seekTooltip.textContent = formatTime(newTime);

    currentSongs.currentTime = newTime;

    document.querySelector(".songtime").textContent =
      `${formatTime(newTime)} / ` + `${formatTime(currentSongs.duration)}`;
  }

  seekbar.addEventListener("pointerdown", (event) => {
    if (!currentSongs.duration) {
      return;
    }

    isSeeking = true;
    seekbar.setPointerCapture(event.pointerId);
    updateSeekPosition(event);
  });

  seekbar.addEventListener("pointermove", (event) => {
    const percent = getSeekPercent(event);

    if (isSeeking) {
      updateSeekPosition(event);
      return;
    }

    const currentProgress =
      Number.parseFloat(seekbar.style.getPropertyValue("--progress")) || 0;

    seekbar.style.setProperty(
      "--hover-position",
      `${Math.max(percent, currentProgress)}%`,
    );

    seekTooltip.style.left = `${percent}%`;

    const previewTime = currentSongs.duration
      ? (currentSongs.duration * percent) / 100
      : 0;

    seekTooltip.textContent = formatTime(previewTime);
  });

  function stopSeeking(event) {
    if (!isSeeking) {
      return;
    }

    updateSeekPosition(event);
    isSeeking = false;

    if (seekbar.hasPointerCapture(event.pointerId)) {
      seekbar.releasePointerCapture(event.pointerId);
    }

    savePlayerState();
  }

  seekbar.addEventListener("pointerup", stopSeeking);

  seekbar.addEventListener("pointercancel", () => {
    isSeeking = false;
  });

  seekbar.addEventListener("pointerleave", () => {
    if (isSeeking) {
      return;
    }

    const progress = currentSongs.duration
      ? (currentSongs.currentTime / currentSongs.duration) * 100
      : 0;

    seekbar.style.setProperty("--hover-position", `${progress}%`);
  });

  document.querySelector(".hamburger").addEventListener("click", () => {
    document.querySelector(".left").style.left = "0";
  });

  document.querySelector(".musicPlaylists").addEventListener("click", () => {
    document.querySelector(".left").style.left = "-120%";
  });

  document.querySelector(".close").addEventListener("click", () => {
    document.querySelector(".left").style.left = "-120%";
  });

  previousButton.addEventListener("click", () => {
    if (currentSongIndex > 0) {
      playMusic(songs[currentSongIndex - 1], false, currentSongIndex - 1);
    }
  });

  nextButton.addEventListener("click", () => {
    if (currentSongIndex + 1 < songs.length) {
      playMusic(songs[currentSongIndex + 1], false, currentSongIndex + 1);
    }
  });

  currentSongs.addEventListener("ended", () => {
    if (currentSongIndex + 1 < songs.length) {
      playMusic(songs[currentSongIndex + 1], false, currentSongIndex + 1);
    } else {
      updateMainPlayIcon();
      updateSongListIcons();
    }
  });

  currentSongs.volume = lastVolume;
  volumeSlider.value = Math.round(lastVolume * 100);
  updateVolumeIcon();
  updateVolumeProgress();

  document.querySelector(".volume").classList.add("volume-ready");

  volumeSlider.addEventListener("input", (event) => {
    currentSongs.volume = Number(event.target.value) / 100;

    if (currentSongs.volume > 0) {
      lastVolume = currentSongs.volume;

      localStorage.setItem(
        "nksMusicPlayerVolume",
        currentSongs.volume.toString(),
      );
    }

    updateVolumeProgress();
    updateVolumeIcon();
  });

  volumeIcon.addEventListener("click", () => {
    if (currentSongs.volume > 0) {
      lastVolume = currentSongs.volume;
      currentSongs.volume = 0;
      volumeSlider.value = 0;
    } else {
      currentSongs.volume = lastVolume > 0 ? lastVolume : 0.75;

      volumeSlider.value = Math.round(currentSongs.volume * 100);
    }

    updateVolumeProgress();
    updateVolumeIcon();
  });
  window.addEventListener("beforeunload", () => {
    savePlayerState();
  });
}

main().catch((error) => {
  console.error("Music player failed to start:", error);
});
