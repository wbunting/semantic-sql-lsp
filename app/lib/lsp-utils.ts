export function parseCubeSchemas(cubeSchemas: any[]): any {
  const metadata: Record<string, any> = {};
  cubeSchemas.forEach((cube) => {
    metadata[cube.cubeName] = {
      dimensions: cube.dimensions,
      measures: cube.measures,
      joins: cube.joins,
      segments: cube.segments,
    };
  });
  return metadata;
}
