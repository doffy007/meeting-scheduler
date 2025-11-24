import React from "react";

export default function TimePicker({ value, onChange }) {
    let [h, m] = value.split(":").map(Number);

    let ampm = h >= 12 ? "PM" : "AM";
    let hour12 = h % 12;
    if (hour12 === 0) hour12 = 12;

    const update = (newHour12, newMinute, newAMPM) => {
        let hr = parseInt(newHour12, 10);

        if (newAMPM === "PM" && hr !== 12) hr += 12;
        if (newAMPM === "AM" && hr === 12) hr = 0;

        const final = `${String(hr).padStart(2, "0")}:${String(newMinute).padStart(2, "0")}`;
        onChange(final);
    };

    return (
        <div className="timepicker-12h" style={{ display: "flex", gap: "6px" }}>
            <select
                value={hour12}
                onChange={(e) => update(e.target.value, m, ampm)}
            >
                {[...Array(12)].map((_, i) => (
                    <option key={i+1} value={i+1}>{i+1}</option>
                ))}
            </select>

            <select
                value={String(m).padStart(2, "0")}
                onChange={(e) => update(hour12, e.target.value, ampm)}
            >
                {["00", "15", "30", "45"].map(min => (
                    <option key={min} value={min}>{min}</option>
                ))}
            </select>

            <select
                value={ampm}
                onChange={(e) => update(hour12, m, e.target.value)}
            >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
            </select>
        </div>
    );
}
