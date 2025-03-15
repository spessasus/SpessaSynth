/**
 * icons.js
 * purpose: contains all icons used in the spessasynth app
 * note: mostly from bootstrap-icons
 */

/**
 * @param size {number}
 * @returns {string}
 */
export function getPlaySvg(size)
{
    return `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' fill='currentColor' viewBox='0 0 16 16'>
        <path d='m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z'/>
    </svg>`;
}

/**
 * @param size {number}
 * @returns {string}
 */
export function getPauseSvg(size)
{
    return `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' fill='currentColor'  viewBox='0 0 16 16'>
        <path d='M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z'/>
    </svg>`;
}

/**
 * @param size {number}
 * @returns {string}
 */
export function getLoopSvg(size)
{
    return `<svg fill='currentColor' xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 100 100'>
	<path d='M83.729,23.57c-0.007-0.562-0.32-1.084-0.825-1.337c-0.503-0.259-1.107-0.212-1.568,0.114l-5.944,4.262l-0.468,0.336
		c-6.405-6.391-15.196-10.389-24.938-10.389c-13.284,0-24.878,7.354-30.941,18.201l0.024,0.013
		c-0.548,1.183-0.124,2.607,1.026,3.271c0.001,0,0.001,0,0.002,0.001l8.136,4.697c1.218,0.704,2.777,0.287,3.48-0.932
		c0.006-0.011,0.009-0.023,0.015-0.034c3.591-6.404,10.438-10.747,18.289-10.747c4.879,0,9.352,1.696,12.914,4.5l-1.001,0.719
		l-5.948,4.262c-0.455,0.327-0.696,0.89-0.611,1.447c0.081,0.558,0.471,1.028,1.008,1.208l25.447,8.669
		c0.461,0.162,0.966,0.084,1.367-0.203c0.399-0.29,0.629-0.746,0.627-1.23L83.729,23.57z'/>
	<path d='M79.904,61.958c0,0-0.001,0-0.002-0.001l-8.136-4.697c-1.218-0.704-2.777-0.287-3.48,0.932
		c-0.006,0.011-0.009,0.023-0.015,0.034c-3.591,6.404-10.438,10.747-18.289,10.747c-4.879,0-9.352-1.696-12.914-4.5l1.001-0.719
		l5.948-4.262c0.455-0.327,0.696-0.89,0.611-1.447c-0.081-0.558-0.471-1.028-1.008-1.208l-25.447-8.669
		c-0.461-0.162-0.966-0.084-1.367,0.203c-0.399,0.29-0.629,0.746-0.627,1.23l0.092,26.828c0.007,0.562,0.32,1.084,0.825,1.337
		c0.503,0.259,1.107,0.212,1.568-0.114l5.944-4.262l0.468-0.336c6.405,6.391,15.196,10.389,24.938,10.389
		c13.284,0,24.878-7.354,30.941-18.201L80.93,65.23C81.478,64.046,81.055,62.623,79.904,61.958z'/>
</svg>`;
}

/**
 * @param size {number}
 * @returns {string}
 */
export function getTextSvg(size)
{
    return `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' fill='currentColor' class='bi bi-text-center' viewBox='0 0 16 16'>
  <path fill-rule='evenodd' d='M4 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z'/>
</svg>`;
}

export function getForwardSvg(size)
{
    return `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' fill='currentColor' class='bi bi-skip-end-fill' viewBox='0 0 16 16'>
  <path d='M12.5 4a.5.5 0 0 0-1 0v3.248L5.233 3.612C4.693 3.3 4 3.678 4 4.308v7.384c0 .63.692 1.01 1.233.697L11.5 8.753V12a.5.5 0 0 0 1 0V4z'/>
</svg>`;
}

export function getBackwardSvg(size)
{
    return `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' fill='currentColor' class='bi bi-skip-start-fill' viewBox='0 0 16 16'>
  <path d='M4 4a.5.5 0 0 1 1 0v3.248l6.267-3.636c.54-.313 1.232.066 1.232.696v7.384c0 .63-.692 1.01-1.232.697L5 8.753V12a.5.5 0 0 1-1 0V4z'/>
</svg>`;
}

export function getVolumeSvg(size)
{
    return `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' fill='currentColor' class='bi bi-volume-up-fill' viewBox='0 0 16 16'>
  <path d='M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z'/>
  <path d='M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z'/>
  <path d='M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z'/>
</svg>`;
}

export function getEmptyMicSvg(size)
{
    return `<svg xmlns='http://www.w3.org/2000/svg' width='${size * 0.8}' height='${size * 0.8}' fill='currentColor' class='bi bi-mic' viewBox='0 0 16 16'>
  <path d='M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5'/>
  <path d='M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3'/>
</svg>`;
}

export function getMicSvg(size)
{
    return `<svg xmlns='http://www.w3.org/2000/svg' width='${size * 0.9}' height='${size * 0.9}' fill='currentColor' class='bi bi-mic-fill' viewBox='0 0 16 16'>
  <path d='M5 3a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0z'/>
  <path d='M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5'/>
</svg>`;
}

export function getMuteSvg(size)
{
    return `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' style='color: red;' class='bi bi-volume-mute-fill' viewBox='0 0 16 16'>
  <path style='color: red;' fill='currentColor' d='M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06zm7.137 2.096a.5.5 0 0 1 0 .708L12.207 8l1.647 1.646a.5.5 0 0 1-.708.708L11.5 8.707l-1.646 1.647a.5.5 0 0 1-.708-.708L10.793 8 9.146 6.354a.5.5 0 1 1 .708-.708L11.5 7.293l1.646-1.647a.5.5 0 0 1 .708 0z'/>
</svg>`;
}

export function getDrumsSvg(size)
{
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' width='${size}' height='${size}' class='bi bi-drum-fill' fill='currentColor'>
    <path d='M494,12L258.3,123.8c-6.8-4.6-15.1-7.3-24-7.3c-23.6,0-42.6,19.1-42.6,42.6s19.1,42.6,42.6,42.6
    \t\tc22.4,0,40.9-17.3,42.6-39.3l129.2-61.3c38.7,16.3,62.6,37.6,62.6,57.9c0,40.2-91.1,85.2-213.1,85.2s-213.1-45-213.1-85.2
    \t\ts91.1-85.2,213.1-85.2c3.7,0,7-0.1,10.7,0l75.2-35.3c-26.7-4.5-55.3-7.3-85.9-7.3C109.9,31.3,0,86.2,0,159.1v213.1
    \t\tc0,21.1,9.5,40.4,24,55.9c14.5,15.6,34.2,28.1,57.3,38.6c46.1,21,107.1,33.3,174.4,33.3s128.3-12.3,174.4-33.3
    \t\tc23.1-10.5,42.8-23.1,57.3-38.6c14.5-15.6,24-34.9,24-55.9V159.1c0-31.5-20.8-59.4-55.9-81.2L512,50.6L494,12z M42.6,231.7
    \t\tc21.6,16.3,50.7,29.7,85.2,39.3v168.4c-10.7-3.3-20.4-7.2-29.3-11.3c-19.3-8.8-34-19.4-43.3-29.3c-9.2-9.9-12.7-18.2-12.7-26.6
    \t\tV231.7z M468.7,231.7v140.5c0,8.4-3.4,16.7-12.7,26.6c-9.2,9.9-24,20.5-43.3,29.3c-8.9,4.1-18.6,8-29.3,11.3V271
    \t\tC418,261.4,447.1,248,468.7,231.7z M170.4,280.3c26.5,4.4,55,6.7,85.2,6.7s58.8-2.2,85.2-6.7v169.1c-26.2,4.9-54.9,8-85.2,8
    \t\ts-59-3.1-85.2-8V280.3z'/>
   </svg>`;
}

export function getNoteSvg(size)
{
    return `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' fill='currentColor' class='bi bi-music-note' viewBox='0 0 16 16'>
  <path d='M9 13c0 1.105-1.12 2-2.5 2S4 14.105 4 13s1.12-2 2.5-2 2.5.895 2.5 2z'/>
  <path fill-rule='evenodd' d='M9 3v10H8V3h1z'/>
  <path d='M8 2.82a1 1 0 0 1 .804-.98l3-.6A1 1 0 0 1 13 2.22V4L8 5V2.82z'/>
</svg>`;
}

export function getGearSvg(size)
{
    return `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' fill='currentColor' class='bi bi-gear-fill' viewBox='0 0 16 16'>
  <path d='M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z'/>
</svg>`;
}

export function getDoubleNoteSvg(size)
{
    return `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' fill='currentColor' class='bi bi-music-note-beamed' viewBox='0 0 16 16'>
  <path d='M6 13c0 1.105-1.12 2-2.5 2S1 14.105 1 13s1.12-2 2.5-2 2.5.896 2.5 2m9-2c0 1.105-1.12 2-2.5 2s-2.5-.895-2.5-2 1.12-2 2.5-2 2.5.895 2.5 2'/>
  <path fill-rule='evenodd' d='M14 11V2h1v9zM6 3v10H5V3z'/>
  <path d='M5 2.905a1 1 0 0 1 .9-.995l8-.8a1 1 0 0 1 1.1.995V3L5 4z'/>
</svg>`;
}

export function getDownArrowSvg(size)
{
    return `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' fill='currentColor' class='bi bi-chevron-down' viewBox='0 0 16 16'>
  <path fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708'/>
</svg>`;
}

export function getLockSVG(size)
{
    return `<svg xmlns='http://www.w3.org/2000/svg' width='${size * 0.8}' height='${size * 0.8}' fill='currentColor' class='bi bi-lock-fill' viewBox='0 0 16 16'>
  <path d='M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2'/>
</svg>`;
}

export function getUnlockSVG(size)
{
    return `<svg xmlns='http://www.w3.org/2000/svg' width='${size * 0.8}' height='${size * 0.8}' fill='currentColor' class='bi bi-unlock-fill' viewBox='0 0 16 16'>
  <path d='M11 1a2 2 0 0 0-2 2v4a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h5V3a3 3 0 0 1 6 0v4a.5.5 0 0 1-1 0V3a2 2 0 0 0-2-2'/>
</svg>`;
}

export function getSf2LogoSvg(size)
{
    return `<svg width='${size}' height='${size}' viewBox='0 0 83.174 81.103' fill='currentColor' xml:space='preserve' xmlns='http://www.w3.org/2000/svg'>
<defs>
<clipPath id='clipPath7'>
<rect transform='rotate(44.958)' x='65.485' y='103.08' width='83.745' height='81.546' fill='currentColor' stroke-width='.26458'/>
</clipPath>
<clipPath id='clipPath9'
><rect transform='matrix(.67799 -.73507 .73806 .67473 0 0)' x='67.253' y='100.5' width='86.006' height='79.511' fill='currentColor' fill-opacity='.09612' stroke-width='.26476'/>
</clipPath>
<clipPath id='clipPath10'><rect x='65.485' y='103.08' width='83.745' height='81.546' fill='#0ff' stroke-width='.26458'/>
</clipPath>
<clipPath id='clipPath11'><rect x='65.485' y='103.08' width='83.745' height='81.546' fill='currentColor' stroke-width='.26458'/>
</clipPath>
</defs>
<g transform='translate(-65.485 -103.23)'>
<path d='m65.262 139.48c1.3624-6.7496 1.6548-14.043 5.7345-19.888 5.7864-8.3588 14.537-15.846 25.154-16.3 1.7234-0.0776 5.5034-0.28571 1.9074 0.65373-7.4866 2.6362-13.723 7.7642-19.543 12.986-6.2291 6.337-9.3022 14.78-13.252 22.549z' clip-path='url(#clipPath11)' stroke-width='.26458'/><path d='m83.381 144.84c0.987-5.348 1.5703-11.153 5.4341-15.36 4.1817-5.3006 10.757-8.715 17.552-8.6209-6.116 1.9994-11.467 6.0247-15.711 10.776-3.242 3.9158-4.9545 8.7506-7.2747 13.206z' clip-path='url(#clipPath10)' stroke-width='.17519'/>
<path transform='matrix(.657 .75389 -.71867 .69536 0 0)' d='m176.97-34.49a50.988 16.042 90 0 0-10.353 47.674 50.988 16.042 90 0 0 16.042 50.988 50.988 16.042 90 0 0 15.091-33.843c0.03523-0.004687 0.08911-0.032268 0.12752-0.040899l-0.30503 0.026749-1.2845-35.938 1.2651-0.11118a50.988 16.042 90 0 0-14.894-32.069 50.988 16.042 90 0 0-5.6883 3.3134zm-2.8904 43.129c0.95278-1.0096 1.7992-1.5659 0.54206 0.59765-1.2633 3.6709-1.2266 8.239 1.5374 11.026-3.874-1.5224-5.9894-6.4334-3.2573-10.178 0.28939-0.43335 0.74478-0.98606 1.1779-1.445zm23.969-14.417 0.03731-0.0032873c-0.01217 1.409e-4 -0.02503 0.0027689-0.03731 0.0032873zm0.3756 0.055028 1.2362 34.585c1.8993-1.8327 3.683-3.8858 5.5702-5.7411l-0.5343-23.05c-0.9706-1.4279-2.6664-2.5006-3.9092-3.7953-0.84642-0.47048-1.4531-1.7381-2.3628-1.9983z' clip-path='url(#clipPath9)' stroke-width='.28839'/>
<rect transform='rotate(-44.958)' x='-37.937' y='206.86' width='23.377' height='6.8056' clip-path='url(#clipPath7)' stroke-width='.26458'/></g></svg>

    `;
}

export function getHourglassSvg(size)
{
    return `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' fill='currentColor' class='bi bi-hourglass' viewBox='0 0 16 16'>
      <path d='M2 1.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-1v1a4.5 4.5 0 0 1-2.557 4.06c-.29.139-.443.377-.443.59v.7c0 .213.154.451.443.59A4.5 4.5 0 0 1 12.5 13v1h1a.5.5 0 0 1 0 1h-11a.5.5 0 1 1 0-1h1v-1a4.5 4.5 0 0 1 2.557-4.06c.29-.139.443-.377.443-.59v-.7c0-.213-.154-.451-.443-.59A4.5 4.5 0 0 1 3.5 3V2h-1a.5.5 0 0 1-.5-.5m2.5.5v1a3.5 3.5 0 0 0 1.989 3.158c.533.256 1.011.791 1.011 1.491v.702c0 .7-.478 1.235-1.011 1.491A3.5 3.5 0 0 0 4.5 13v1h7v-1a3.5 3.5 0 0 0-1.989-3.158C8.978 9.586 8.5 9.052 8.5 8.351v-.702c0-.7.478-1.235 1.011-1.491A3.5 3.5 0 0 0 11.5 3V2z'/>
    </svg>`;
}

export function getExclamationSvg(size)
{
    return `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' fill='currentColor' class='bi bi-exclamation-triangle' viewBox='0 0 16 16'>
  <path d='M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.15.15 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.2.2 0 0 1-.054.06.1.1 0 0 1-.066.017H1.146a.1.1 0 0 1-.066-.017.2.2 0 0 1-.054-.06.18.18 0 0 1 .002-.183L7.884 2.073a.15.15 0 0 1 .054-.057m1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767z'/>
  <path d='M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z'/>
</svg>`;
}

export function getCheckSvg(size)
{
    return `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' fill='currentColor' class='bi bi-check2' viewBox='0 0 16 16'>
  <path d='M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0'/>
</svg>`;
}

export function getShuffleSvg(size)
{
    return `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' fill='none' class='bi bi-shuffle' viewBox='-3 -3 22 22'>
    <path d='M0 3.5A.5.5 0 0 1 .5 3H1c2.202 0 3.827 1.24 4.874 2.418.49.552.865 1.102 1.126 1.532.26-.43.636-.98 1.126-1.532C9.173 4.24 10.798 3 13 3v1c-1.798 0-3.173 1.01-4.126 2.082A9.6 9.6 0 0 0 7.556 8a9.6 9.6 0 0 0 1.317 1.918C9.828 10.99 11.204 12 13 12v1c-2.202 0-3.827-1.24-4.874-2.418A10.6 10.6 0 0 1 7 9.05c-.26.43-.636.98-1.126 1.532C4.827 11.76 3.202 13 1 13H.5a.5.5 0 0 1 0-1H1c1.798 0 3.173-1.01 4.126-2.082A9.6 9.6 0 0 0 6.444 8a9.6 9.6 0 0 0-1.317-1.918C4.172 5.01 2.796 4 1 4H.5a.5.5 0 0 1-.5-.5' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/>
    <path d='M13 5.466V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192m0 9v-3.932a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'/></svg>
`;
}

export function getSpeedSvg(size)
{
    return `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' fill='currentColor' class='bi bi-speedometer' viewBox='-1 -1 18 18'>
  <path d='M8 2a.5.5 0 0 1 .5.5V4a.5.5 0 0 1-1 0V2.5A.5.5 0 0 1 8 2M3.732 3.732a.5.5 0 0 1 .707 0l.915.914a.5.5 0 1 1-.708.708l-.914-.915a.5.5 0 0 1 0-.707M2 8a.5.5 0 0 1 .5-.5h1.586a.5.5 0 0 1 0 1H2.5A.5.5 0 0 1 2 8m9.5 0a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 0 1H12a.5.5 0 0 1-.5-.5m.754-4.246a.39.39 0 0 0-.527-.02L7.547 7.31A.91.91 0 1 0 8.85 8.569l3.434-4.297a.39.39 0 0 0-.029-.518z'/>
  <path fill-rule='evenodd' d='M6.664 15.889A8 8 0 1 1 9.336.11a8 8 0 0 1-2.672 15.78zm-4.665-4.283A11.95 11.95 0 0 1 8 10c2.186 0 4.236.585 6.001 1.606a7 7 0 1 0-12.002 0'/>
</svg>`;
}