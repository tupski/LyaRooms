import React, { useState, useRef } from 'react';

const PinInput = ({ onComplete }) => {
  const [pin, setPin] = useState(new Array(6).fill(""));
  const inputsRef = useRef([]);

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false;
    const newPin = [...pin];
    newPin[index] = element.value;
    setPin(newPin);

    if (element.value !== "" && index < 5) {
      inputsRef.current[index + 1].focus();
    }

    if (newPin.every(digit => digit !== "")) {
      onComplete(newPin.join(""));
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  return (
    <div className="flex justify-center gap-2">
      {pin.map((data, index) => (
        <input
          key={index}
          ref={el => inputsRef.current[index] = el}
          className="w-12 h-14 text-center text-2xl font-bold text-gray-900 bg-gray-100 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none"
          type="text"
          name="pin"
          maxLength="1"
          value={data}
          onChange={e => handleChange(e.target, index)}
          onKeyDown={e => handleKeyDown(e, index)}
          onFocus={e => e.target.select()}
        />
      ))}
    </div>
  );
};

export default PinInput;