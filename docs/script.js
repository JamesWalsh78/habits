// script.js - Handles form submission to the backend

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

    try {
      const response = await fetch('https://habits-y6qj.onrender.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Data submitted successfully!');
      } else {
        alert('Error submitting data.');
      }
    } catch (error) {
      console.error('Request failed', error);
      alert('Failed to connect to the server.');
    }
  });
});
