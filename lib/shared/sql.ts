export function splitSqlStatements(sql:string){
  const source=sql
    .split("\n")
    .filter((line)=>!line.trimStart().startsWith("--"))
    .join("\n");

  const statements:string[]=[];
  let current="";
  let inSingleQuote=false;
  let inDoubleQuote=false;

  for(let index=0;index<source.length;index+=1){
    const char=source[index];

    if(char==="'"&&!inDoubleQuote){
      current+=char;
      if(inSingleQuote&&source[index+1]==="'"){
        current+=source[index+1];
        index+=1;
        continue;
      }
      inSingleQuote=!inSingleQuote;
      continue;
    }

    if(char==='"'&&!inSingleQuote){
      current+=char;
      if(inDoubleQuote&&source[index+1]==='"'){
        current+=source[index+1];
        index+=1;
        continue;
      }
      inDoubleQuote=!inDoubleQuote;
      continue;
    }

    if(char===";"&&!inSingleQuote&&!inDoubleQuote){
      const statement=current.trim();
      if(statement) statements.push(statement);
      current="";
      continue;
    }
    current+=char;
  }

  const trailing=current.trim();
  if(trailing) statements.push(trailing);
  if(inSingleQuote||inDoubleQuote){
    throw new Error("Portal migration contains an unterminated SQL string.");
  }
  return statements;
}
