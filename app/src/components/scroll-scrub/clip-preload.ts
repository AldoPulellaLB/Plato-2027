/**
 * Whole-clip downloads shared by the preloader and the film engine.
 *
 * The engine needs each clip as one Blob before it can scrub it, and on its own it
 * only starts a download when the film is 1.5 screens away, so the poster sat on
 * screen while the clip arrived. Here the downloads start as the HTML is parsed: a
 * head script (clipPreloadScript, rendered by the preloader) fetches the clips in
 * scroll order at low priority, keeps their progress for the loader's ring, and
 * holds the finished Blobs for the session. The engine takes a held or in-flight
 * download instead of fetching the clip again (clipBlob), so a return to the film
 * is instant too.
 *
 * Nothing here runs at module top level, so it is SSR safe.
 */

/** The engine's phone sources: coarse pointer or narrow screen (matches its poster <source media>). */
export const FILM_MOBILE_QUERY = "(hover: none) and (pointer: coarse), (max-width: 860px)";

interface ClipDownload {
  /** Bytes read so far, and the response's Content-Length (0 until the headers arrive, or if absent). */
  loaded: number;
  total: number;
  done: boolean;
  failed: boolean;
  blob: Promise<Blob>;
}

declare global {
  interface Window {
    /** Every clip download this page has started, by URL. */
    __platoClips?: Record<string, ClipDownload>;
    /** Start (or join) the download of one clip. A failed download starts again. */
    __platoClip?: (url: string) => ClipDownload;
    /** Download the story's films for this screen, one after another; false when skipped. */
    __platoPreloadFilms?: () => boolean;
    /** The film URLs the preload is fetching, in scroll order. */
    __platoFilmQueue?: string[];
    /** The head script's stand-in for the loader's CSS failsafe while it waits for the films. */
    __platoPlFailsafe?: number;
  }
}

interface FilmSources {
  clip: string;
  mobileClip?: string;
}

/**
 * The head script. It defines the shared download registry on every page, and on
 * the home page starts the films and tells the loader to wait for them: <html
 * data-pl="wait"> stands the CSS failsafe down, and a timer of its own fades the
 * loader after `failsafeMs` in case the app never arrives to take over. No films on
 * reduced motion (the engine shows posters only) or on Save-Data and 2G connections.
 */
export function clipPreloadScript(films: readonly FilmSources[], failsafeMs: number) {
  const sources = JSON.stringify(films.map((film) => [film.clip, film.mobileClip ?? film.clip]));
  return `(function(){try{var w=window,d=document.documentElement;
if(!w.__platoClip){var clips=w.__platoClips={};
w.__platoClip=function(url){var c=clips[url];if(c&&!c.failed)return c;
c=clips[url]={loaded:0,total:0,done:false,failed:false};
c.blob=fetch(url,{priority:"low"}).then(function(res){if(!res.ok)throw new Error("Clip failed: "+res.status);
c.total=Number(res.headers.get("content-length"))||0;var type=res.headers.get("content-type")||"video/mp4";
if(!res.body||!res.body.getReader)return res.blob();var reader=res.body.getReader(),parts=[];
function pump(){return reader.read().then(function(r){if(r.done)return new Blob(parts,{type:type});parts.push(r.value);c.loaded+=r.value.byteLength;return pump();});}
return pump();}).then(function(blob){c.done=true;c.loaded=blob.size;if(!c.total)c.total=blob.size;return blob;},function(e){c.failed=true;throw e;});
return c;};
w.__platoPreloadFilms=function(){var n=navigator.connection;
if(w.matchMedia("(prefers-reduced-motion: reduce)").matches||(n&&(n.saveData||/2g$/.test(n.effectiveType||""))))return false;
var films=${sources},pick=function(f){return w.matchMedia(${JSON.stringify(FILM_MOBILE_QUERY)}).matches?f[1]:f[0];},queue=w.__platoFilmQueue=films.map(pick);
films.reduce(function(chain,f,i){return chain.then(function(){var url=queue[i]=pick(f);return w.__platoClip(url).blob;}).catch(function(){});},Promise.resolve());
return true;};}
if(location.pathname==="/"&&w.__platoPreloadFilms()){d.setAttribute("data-pl","wait");
w.__platoPlFailsafe=setTimeout(function(){d.setAttribute("data-pl","timeout");},${failsafeMs});}
}catch(e){}})();`;
}

/** Start the films for this screen (a no-op once they are under way, or where the head script skips them). */
export function preloadFilms() {
  if (typeof window !== "undefined") window.__platoPreloadFilms?.();
}

/**
 * How far the film preload has come, 0 to 1 (each clip counts equally; a failed
 * clip counts as finished so it never holds the loader), or null when none is running.
 */
export function filmPreloadProgress(): number | null {
  if (typeof window === "undefined") return null;
  const urls = window.__platoFilmQueue;
  const clips = window.__platoClips;
  if (!urls?.length || !clips) return null;
  let sum = 0;
  for (const url of urls) {
    const clip = clips[url];
    if (!clip) continue;
    sum += clip.done || clip.failed ? 1 : clip.total ? Math.min(clip.loaded / clip.total, 1) : 0;
  }
  return sum / urls.length;
}

const abortError = () => new DOMException("The clip load was aborted", "AbortError");

/**
 * The clip as a Blob for the engine. Joins the shared download when the head
 * script is present (aborting only stops waiting: the download carries on for the
 * next visit), else fetches it directly as the engine always did.
 */
export async function clipBlob(url: string, signal: AbortSignal): Promise<Blob> {
  const shared = window.__platoClip?.(url);
  if (!shared) {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Clip failed: ${response.status}`);
    }
    return response.blob();
  }
  if (signal.aborted) {
    throw abortError();
  }
  return new Promise<Blob>((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener("abort", onAbort, { once: true });
    shared.blob.then(
      (blob) => {
        signal.removeEventListener("abort", onAbort);
        resolve(blob);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}
