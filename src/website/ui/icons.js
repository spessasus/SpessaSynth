/**
 * @param size {number}
 * @returns {string}
 */
export function getPlaySvg(size)
{
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16">
        <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
    </svg>`;
}

/**
 * @param size {number}
 * @returns {string}
 */
export function getPauseSvg(size)
{
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor"  viewBox="0 0 16 16">
        <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/>
    </svg>`;
}

/**
 * @param size {number}
 * @returns {string}
 */
export function getLoopSvg(size)
{
    return `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
	<path d="M83.729,23.57c-0.007-0.562-0.32-1.084-0.825-1.337c-0.503-0.259-1.107-0.212-1.568,0.114l-5.944,4.262l-0.468,0.336
		c-6.405-6.391-15.196-10.389-24.938-10.389c-13.284,0-24.878,7.354-30.941,18.201l0.024,0.013
		c-0.548,1.183-0.124,2.607,1.026,3.271c0.001,0,0.001,0,0.002,0.001l8.136,4.697c1.218,0.704,2.777,0.287,3.48-0.932
		c0.006-0.011,0.009-0.023,0.015-0.034c3.591-6.404,10.438-10.747,18.289-10.747c4.879,0,9.352,1.696,12.914,4.5l-1.001,0.719
		l-5.948,4.262c-0.455,0.327-0.696,0.89-0.611,1.447c0.081,0.558,0.471,1.028,1.008,1.208l25.447,8.669
		c0.461,0.162,0.966,0.084,1.367-0.203c0.399-0.29,0.629-0.746,0.627-1.23L83.729,23.57z"/>
	<path d="M79.904,61.958c0,0-0.001,0-0.002-0.001l-8.136-4.697c-1.218-0.704-2.777-0.287-3.48,0.932
		c-0.006,0.011-0.009,0.023-0.015,0.034c-3.591,6.404-10.438,10.747-18.289,10.747c-4.879,0-9.352-1.696-12.914-4.5l1.001-0.719
		l5.948-4.262c0.455-0.327,0.696-0.89,0.611-1.447c-0.081-0.558-0.471-1.028-1.008-1.208l-25.447-8.669
		c-0.461-0.162-0.966-0.084-1.367,0.203c-0.399,0.29-0.629,0.746-0.627,1.23l0.092,26.828c0.007,0.562,0.32,1.084,0.825,1.337
		c0.503,0.259,1.107,0.212,1.568-0.114l5.944-4.262l0.468-0.336c6.405,6.391,15.196,10.389,24.938,10.389
		c13.284,0,24.878-7.354,30.941-18.201L80.93,65.23C81.478,64.046,81.055,62.623,79.904,61.958z"/>
</svg>`;
}

/**
 * @param size {number}
 * @returns {string}
 */
export function getTextSvg(size)
{
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor" class="bi bi-text-center" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M4 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/>
</svg>`;
}

export function getForwardSvg(size)
{
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor" class="bi bi-skip-end-fill" viewBox="0 0 16 16">
  <path d="M12.5 4a.5.5 0 0 0-1 0v3.248L5.233 3.612C4.693 3.3 4 3.678 4 4.308v7.384c0 .63.692 1.01 1.233.697L11.5 8.753V12a.5.5 0 0 0 1 0V4z"/>
</svg>`;
}

export function getBackwardSvg(size)
{
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor" class="bi bi-skip-start-fill" viewBox="0 0 16 16">
  <path d="M4 4a.5.5 0 0 1 1 0v3.248l6.267-3.636c.54-.313 1.232.066 1.232.696v7.384c0 .63-.692 1.01-1.232.697L5 8.753V12a.5.5 0 0 1-1 0V4z"/>
</svg>`;
}