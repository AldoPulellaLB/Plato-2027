/**
 * Whole-file downloads shared by the preloader, the film engine and the ambient sound.
 *
 * The engine needs each clip as one Blob before it can scrub it, and on its own it
 * only starts a download when the film is 1.5 screens away, so the poster sat on
 * screen while the clip arrived. Here the downloads start as the HTML is parsed: a
 * head script (clipPreloadScript, rendered by the preloader) fetches the ambient
 * audio and the films together at low priority, keeps their progress for the
 * loader's ring, and holds the finished Blobs for the session. The engine and the
 * audio take a held or in-flight download instead of fetching again (clipBlob,
 * window.__platoClip), so the films play and the sound starts at once.
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
    /** Download the ambient audio and the story's films for this screen; true when the films are included. */
    __platoPreloadFilms?: () => boolean;
    /** Every URL the preload is fetching (audio, then the films in scroll order). */
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
 * the home page starts the audio and the films (all at once, so the loader's ring
 * can count real bytes) and tells the loader to wait for them: <html data-pl="wait">
 * stands the CSS failsafe down, and a timer of its own fades the loader after
 * `failsafeMs` in case the app never arrives to take over. Reduced motion gets the
 * audio only (the engine shows posters, never the films); Save-Data gets nothing.
 */
export function clipPreloadScript(films: readonly FilmSources[], audio: readonly string[], failsafeMs: number) {
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
w.__platoPreloadFilms=function(){var n=navigator.connection;if(n&&n.saveData)return false;
var still=w.matchMedia("(prefers-reduced-motion: reduce)").matches,m=w.matchMedia(${JSON.stringify(FILM_MOBILE_QUERY)}).matches;
var queue=w.__platoFilmQueue=${JSON.stringify(audio)}.concat(still?[]:${sources}.map(function(f){return m?f[1]:f[0];}));
queue.forEach(function(url){w.__platoClip(url).blob.catch(function(){});});
return !still;};}
if(location.pathname==="/"&&w.__platoPreloadFilms()){d.setAttribute("data-pl","wait");
w.__platoPlFailsafe=setTimeout(function(){d.setAttribute("data-pl","timeout");},${failsafeMs});}
}catch(e){}})();`;
}

/** Start the audio and the films for this screen (a no-op once they are under way, or where the head script skips them). */
export function preloadFilms() {
  if (typeof window !== "undefined") window.__platoPreloadFilms?.();
}

/**
 * How far the preload has come, 0 to 1, by bytes across every file (a failed file
 * drops out so it never holds the loader), or null when none is running. Until every
 * file has reported its size the count stops short of 1.
 */
export function filmPreloadProgress(): number | null {
  if (typeof window === "undefined") return null;
  const urls = window.__platoFilmQueue;
  const clips = window.__platoClips;
  if (!urls?.length || !clips) return null;
  let loaded = 0;
  let total = 0;
  let unsized = 0;
  for (const url of urls) {
    const clip = clips[url];
    if (clip?.failed) continue;
    if (!clip || !clip.total) {
      unsized += 1;
      continue;
    }
    loaded += clip.done ? clip.total : Math.min(clip.loaded, clip.total);
    total += clip.total;
  }
  if (!total) return unsized ? 0 : 1;
  return (loaded / total) * (unsized ? 0.95 : 1);
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
