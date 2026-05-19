export interface ThemeVariables {
  bg: string;
  ink: string;
  hero: string;
  muted: string;
  accent: string;
  surface: string;
  line: string;
  bg0: string;
  bg1: string;
  bg2: string;
  gold: string;
  goldSoft: string;
  violet: string;
  violetSoft: string;
  cyan: string;
  text: string;
}

export interface BuildOptions {
  includeWavFiles: boolean;
}

export interface ResolvedTrack {
  trackFolder: string;
  title: string;
  releaseDate: string;
  artworkFileName: string;
  artworkSourcePath: string;
  songJsonSourcePath: string;
  wavSourcePath: string;
  wavOutputFileName: string;
  mp3OutputFileName: string;
  audioPathFromRoot: string;
  contentPathFromRoot: string;
}

export interface ResolvedAlbum {
  albumFolder: string;
  title: string;
  releaseDate: string;
  description: string;
  artworkPathFromRoot: string;
  albumArtworkSourcePath: string;
  albumArtworkFileName: string;
  tracks: ResolvedTrack[];
}
