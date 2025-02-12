// script.js - Updated to ensure form submits correctly

document.addEventListener("DOMContentLoaded", () => {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("dateField").value = today;

  const habitForm = document.getElementById("habitForm");
  habitForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent default form submission

    const formData = {
      date: document.getElementById("dateField").value,
      water: document.getElementById("waterSlider").value,
      running: document.getElementById("runningRange").value,
      gym: document.getElementById("gymSlider").value,
      reading: document.getElementById("readingSlider").value,
      friends: document.getElementById("friendsDropdown").value,
    };

    const backendURL = "https://your-app-name.onrender.com/api/habits"; // Update with your actual Render URL

    try {
      const response = await fetch(backendURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('✅ Data submitted successfully!');
      } else {
        const errorData = await response.json();
        alert(`❌ Error: ${errorData.message || 'Submission failed.'}`);
      }
    } catch (error) {
      console.error("Request failed", error);
      alert("❌ Failed to connect to the server.");
    }
  });
});
