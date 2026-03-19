export interface CliOutput {
  stream: "stdout" | "stderr";
  line: string;
}

export interface CliComplete {
  exitCode: number;
}
