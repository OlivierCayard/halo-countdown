const monthYear = document.getElementById("month-year");
const datesGrid = document.getElementById("calendar-dates");
const prevBtn = document.getElementById("prev-month");
const nextBtn = document.getElementById("next-month");

let currentDate = new Date();
let selectedDate = null;

let username = localStorage.getItem("username");
if (!username) {
    username = prompt("Enter your name:");
    localStorage.setItem("username", username);
}
document.getElementById("username").textContent = username;

let userEmail = localStorage.getItem("userEmail");
if (!userEmail) {
    userEmail = prompt("Enter your email:");
    localStorage.setItem("userEmail", userEmail);
}

if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
}

function renderCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDate = new Date(year, month + 1, 0).getDate();
    const startDay = firstDay.getDay();

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    monthYear.textContent = `${monthNames[month]} ${year}`;
    datesGrid.innerHTML = "";

    for (let i = 0; i < startDay; i++) {
        const empty = document.createElement("div");
        datesGrid.appendChild(empty);
    }

    for (let day = 1; day <= lastDate; day++) {
        const dateEl = document.createElement("div");
        dateEl.classList.add("date");
        dateEl.textContent = day;

        const isoDate = new Date(year, month, day).toISOString().split("T")[0];
        let events = [];
        try {
            events = JSON.parse(localStorage.getItem("countdowns")) || [];
        } catch (e) {
            console.error("Error parsing events from localStorage:", e);
        }

        if (events.some(e => e.date === isoDate)) {
            const dot = document.createElement("div");
            dot.style.width = "6px";
            dot.style.height = "6px";
            dot.style.borderRadius = "50%";
            dot.style.background = "#63cf6c";
            dot.style.margin = "2px auto 0";
            dateEl.appendChild(dot);
        }

        const today = new Date();
        if (
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        ) {
            dateEl.classList.add("today");
        }

        datesGrid.appendChild(dateEl);

        dateEl.addEventListener("click", () => {
            const previouslySelected = document.querySelector(".date.selected");
            if (previouslySelected) previouslySelected.classList.remove("selected");

            dateEl.classList.add("selected");
            selectedDate = new Date(year, month, day);
            renderSelectedDate(selectedDate);
        });
    }
}

function renderSelectedDate(dateObj) {
    const label = document.getElementById("selected-date-label");
    const eventsDiv = document.getElementById("selected-events");

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    label.textContent = dateObj.toLocaleDateString(undefined, options);

    let events = [];
    try {
        events = JSON.parse(localStorage.getItem("countdowns")) || [];
    } catch (e) {
        console.error("Error parsing events from localStorage:", e);
    }

    const dateKey = dateObj.toISOString().split("T")[0];
    const filtered = events.filter(e => e.date === dateKey);

    if (filtered.length === 0) {
        eventsDiv.innerHTML = `<p>No events yet.</p>`;
    } else {
        eventsDiv.innerHTML = filtered.map(e => `
            <div style="margin: 10px 0;">
                <strong>${e.title}</strong><br>
                ${e.time}
            </div>
        `).join("");
    }
}

prevBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar(currentDate);
});

nextBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar(currentDate);
});

renderCalendar(currentDate);

function sendEmailReminder(eventTitle, description, userEmail = "example@email.com") {
    const templateParams = {
        event_name: eventTitle,
        description: description,
        user_email: userEmail
    };

    emailjs.send("service_uzc1amz", "template_ubd137t", templateParams)
        .then(function (response) {
            console.log("✅ Email sent!", response.status, response.text);
        }, function (error) {
            console.error("❌ Email failed to send:", error);
        });
}

function loadCountdowns() {
    const container = document.getElementById("events-section");
    let events = [];
    try {
        events = JSON.parse(localStorage.getItem("countdowns")) || [];
    } catch (e) {
        console.error("Error loading countdowns from localStorage:", e);
    }

    container.innerHTML = "";

    if (events.length === 0) {
        const empty = document.createElement("div");
        empty.className = "glass-card event-card";
        empty.innerHTML = `
            <p style="text-align:center; font-style:italic;">
                No countdowns yet. Tap + to create one.
            </p>`;
        container.appendChild(empty);
        return;
    }

    function updateOne(innerEl, event) {
        if (!event) return;

        const span = innerEl.querySelector(".event-text");
        const halo = innerEl.closest(".halo-circle");
        const ring = halo.querySelector(".ring-progress");

        const now = new Date();
        const eventTime = new Date(`${event.date}T${event.time}`);
        const diff = Math.max(0, Math.floor((eventTime - now) / 1000));

        if (diff <= 0) {
            if (innerEl.getAttribute("data-state") === "countdown") {
                span.textContent = "Arrived!";
            }

            if (!event.notified) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });

                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("⏰ Countdown Done", {
                        body: `${event.title} has finished.`,
                        icon: "https://cdn-icons-png.flaticon.com/512/1159/1159633.png"
                    });
                }

                sendEmailReminder(event.title, event.description, userEmail);

                event.notified = true;
                let allEvents = JSON.parse(localStorage.getItem("countdowns")) || [];
                allEvents = allEvents.map(e => {
                    if (e.createdAt === event.createdAt) return { ...e, notified: true };
                    return e;
                });
                localStorage.setItem("countdowns", JSON.stringify(allEvents));
            }

            // Still update ring to 100%
            ring.style.strokeDashoffset = 0;
            return;
        }

        const d = Math.floor(diff / 86400);
        const h = Math.floor((diff % 86400) / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;

        if (innerEl.getAttribute("data-state") === "countdown") {
            span.textContent = `${d}d ${h}h ${m}m ${s}s`;
        }

        const created = new Date(event.createdAt);
        const total = eventTime - created;
        const passed = Math.max(0, now - created);
        const percent = Math.max(0, Math.min(100, (passed / total) * 100));
        const circumference = 2 * Math.PI * 54;
        ring.style.strokeDashoffset = (
            circumference * (1 - percent / 100)
        ).toFixed(2);
    }

    events.forEach((event, index) => {
        const card = document.createElement("div");
        card.className = "glass-card event-card";
        card.innerHTML = `
            <div class="card-content">
                <div class="halo-circle" data-index="${index}">
                    <svg class="progress-ring" width="120" height="120">
                        <circle class="ring-bg" cx="60" cy="60" r="54"/>
                        <circle class="ring-progress" cx="60" cy="60" r="54"/>
                    </svg>
                    <div class="inner-circle toggle-text" data-state="name">
                        <span class="event-text">${event.title}</span>
                    </div>
                    <button class="delete-button" title="Delete Event">🗑️</button>
                </div>
            </div>
        `;

        const inner = card.querySelector(".inner-circle");
        inner.addEventListener("click", () => {

            const state = inner.getAttribute("data-state");
            const descriptionSection = document.getElementById("description-section");
            const activeDescription = document.getElementById("active-description");

            if (state === "name") {
                inner.setAttribute("data-state", "countdown");
                updateOne(inner, event);

                if (event.description && state === "name") {
                    descriptionSection.style.display = "block";
                    activeDescription.textContent = event.description;
                }
            } else {
                inner.setAttribute("data-state", "name");
                inner.querySelector(".event-text").textContent = event.title;
                descriptionSection.style.display = "none";
                activeDescription.textContent = "";
            }
        });


        const deleteBtn = card.querySelector(".delete-button");
        deleteBtn.addEventListener("click", () => {
            const updatedEvents = events.filter((_, i) => i !== index);
            localStorage.setItem("countdowns", JSON.stringify(updatedEvents));
            loadCountdowns();
        });

        container.appendChild(card);
        updateOne(inner, event);
    });

    setInterval(() => {
        const latestEvents = JSON.parse(localStorage.getItem("countdowns")) || [];
        document
            .querySelectorAll(".halo-circle")
            .forEach((haloEl) => {
                const idx = +haloEl.dataset.index;
                const innerEl = haloEl.querySelector(".inner-circle");
                const event = latestEvents[idx];
                updateOne(innerEl, event); // ✅ always update ring, regardless of state
            });
    }, 1000);
}

loadCountdowns();
