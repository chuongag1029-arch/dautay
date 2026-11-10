const faces = [
  { code: "U", name: "Trên", color: "white" },
  { code: "R", name: "Phải", color: "red" },
  { code: "F", name: "Trước", color: "green" },
  { code: "D", name: "Dưới", color: "yellow" },
  { code: "L", name: "Trái", color: "orange" },
  { code: "B", name: "Sau", color: "blue" },
];

const moveNames = {
  U: "Mặt trên",
  D: "Mặt dưới",
  L: "Mặt trái",
  R: "Mặt phải",
  F: "Mặt trước",
  B: "Mặt sau",
};

function explainMove(move) {
  const suffix = move.slice(1);

  if (suffix === "'") {
    return `${moveNames[move[0]]}: xoay 90° ngược chiều kim đồng hồ`;
  }

  if (suffix === "2") {
    return `${moveNames[move[0]]}: xoay 180°`;
  }

  return `${moveNames[move[0]]}: xoay 90° theo chiều kim đồng hồ`;
}

const rubik = document.querySelector("#rubik");
let selectedColor = "white";

// Tải trình phát 3D và thay mô hình CSS cũ
const twistyReady = import("https://cdn.cubing.net/v0/js/cubing/twisty");

let cubePlayer = document.querySelector("#cube-player");

if (!cubePlayer) {
  cubePlayer = document.createElement("twisty-player");
  cubePlayer.id = "cube-player";

  const oldCube = document.querySelector("#cube3d");
  const oldStage = oldCube?.closest(".cube-stage");

  if (oldStage) {
    oldStage.replaceWith(cubePlayer);
  }
}

cubePlayer.setAttribute("puzzle", "3x3x3");
cubePlayer.setAttribute("control-panel", "bottom");
cubePlayer.setAttribute("background", "none");

["rotate-cube", "zoom-in", "zoom-out", "reset-view"].forEach((id) => {
  document.querySelector(`#${id}`)?.remove();
});

async function showCubeState(setup, algorithm = "") {
  await twistyReady;
  await customElements.whenDefined("twisty-player");

  cubePlayer.setAttribute("experimental-setup-alg", setup);
  cubePlayer.setAttribute("alg", algorithm);
  cubePlayer.jumpToStart();
}

// Tạo bảng chọn màu
const palette = document.createElement("div");
palette.id = "palette";
document.body.insertBefore(palette, rubik);

faces.forEach(({ color }) => {
  const button = document.createElement("button");
  button.className = "color-choice";
  button.style.backgroundColor = color;
  button.setAttribute("aria-label", `Chọn màu ${color}`);

  if (color === selectedColor) {
    button.classList.add("selected");
  }

  button.addEventListener("click", () => {
    selectedColor = color;

    document.querySelectorAll(".color-choice").forEach((item) => {
      item.classList.remove("selected");
    });

    button.classList.add("selected");
  });

  palette.append(button);
});

// Tạo sáu mặt, mỗi mặt có chín ô
faces.forEach(({ name, color }) => {
  const section = document.createElement("section");
  section.innerHTML = `<h2>${name}</h2><div class="grid"></div>`;

  const grid = section.querySelector(".grid");

  for (let i = 0; i < 9; i++) {
    const square = document.createElement("button");
    square.className = "square";
    square.setAttribute("aria-label", `${name}, ô ${i + 1}`);

    if (i === 4) {
      square.style.backgroundColor = color;
      square.disabled = true;
    } else {
      square.addEventListener("click", () => {
        square.style.backgroundColor = selectedColor;
      });
    }

    grid.append(square);
  }

  rubik.append(section);
});

// Kiểm tra số ô mỗi màu
document.querySelector("#check").addEventListener("click", () => {
  const counts = Object.fromEntries(
    faces.map(({ color }) => [color, 0])
  );

  document.querySelectorAll(".square").forEach((square) => {
    const color = square.style.backgroundColor;

    if (Object.hasOwn(counts, color)) {
      counts[color]++;
    }
  });

  const wrong = Object.entries(counts).filter(([, count]) => count !== 9);

  document.querySelector("#result").textContent =
    wrong.length === 0
      ? "Đúng rồi! Mỗi màu có đủ 9 ô."
      : wrong.map(([color, count]) => `${color}: ${count} ô`).join(" · ");
});

// Tạo trạng thái mẫu đã xáo trộn
document.querySelector("#scramble").addEventListener("click", async () => {
  const result = document.querySelector("#result");

  if (typeof Cube === "undefined") {
    result.textContent =
      "Không tải được bộ Rubik. Kiểm tra kết nối internet.";
    return;
  }

  const scramble = "R U R' U' F2 D L2 B U2 R' F D2 L U' B2";
  const cube = new Cube();
  cube.move(scramble);

  const stickers = cube.asString();
  const colorForFace = {
    U: "white",
    R: "red",
    F: "green",
    D: "yellow",
    L: "orange",
    B: "blue",
  };

  document.querySelectorAll(".square").forEach((square, index) => {
    if (index % 9 !== 4) {
      square.style.backgroundColor = colorForFace[stickers[index]];
    }
  });

  result.textContent = "Đã tạo trạng thái Rubik mẫu.";
  document.querySelector("#solution").replaceChildren();

  await showCubeState(scramble);
});

let solverInitialized = false;

// Giải trạng thái đã nhập và phát lời giải trên mô hình 3D
document.querySelector("#solve").addEventListener("click", async () => {
  const result = document.querySelector("#solution");

  if (typeof Cube === "undefined") {
    result.textContent =
      "Không tải được bộ giải. Kiểm tra kết nối internet.";
    return;
  }

  const faceForColor = {
    "rgb(255, 255, 255)": "U",
    "rgb(255, 0, 0)": "R",
    "rgb(0, 128, 0)": "F",
    "rgb(255, 255, 0)": "D",
    "rgb(255, 165, 0)": "L",
    "rgb(0, 0, 255)": "B",
  };

  const squares = [...document.querySelectorAll(".square")];

  const facelets = squares
    .map((square) => {
      return faceForColor[getComputedStyle(square).backgroundColor] || "?";
    })
    .join("");

  if (facelets.includes("?")) {
    result.textContent = "Có ô chưa được tô màu. Hãy kiểm tra lại.";
    return;
  }

  const counts = {};

  squares.forEach((square) => {
    const color = getComputedStyle(square).backgroundColor;
    counts[color] = (counts[color] || 0) + 1;
  });

  if (Object.values(counts).some((count) => count !== 9)) {
    result.textContent = "Mỗi màu cần xuất hiện đúng 9 lần.";
    return;
  }

  try {
    const cube = Cube.fromString(facelets);

    result.textContent = "Đang tính lời giải…";

    if (!solverInitialized) {
      Cube.initSolver();
      solverInitialized = true;
    }

    const moves = cube.solve().trim();

    if (!moves) {
      await showCubeState("");
      result.textContent = "Khối Rubik đã được giải sẵn!";
      return;
    }

    // Đảo ngược lời giải để dựng trạng thái đã nhập,
    // sau đó phát lời giải về trạng thái hoàn thành.
    await showCubeState(Cube.inverse(moves), moves);

    const moveArray = moves.split(/\s+/);

    result.innerHTML = `
      <strong>Lời giải (${moveArray.length} lượt):</strong>
      <div id="move-list"></div>
      <p id="instruction">
        Dùng thanh điều khiển dưới mô hình để phát hoặc tua lời giải.
      </p>
    `;

    const moveList = result.querySelector("#move-list");

    moveArray.forEach((move, index) => {
      const step = document.createElement("span");
      step.className = "move-step";
      step.title = explainMove(move);
      step.textContent = `${index + 1}. ${move}`;
      moveList.append(step);
    });
  } catch (error) {
    result.textContent =
      "Trạng thái Rubik không hợp lệ. Hãy kiểm tra lại vị trí màu.";
    console.error(error);
  }
});