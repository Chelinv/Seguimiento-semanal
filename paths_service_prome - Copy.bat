@echo off
set pathWCF=D:\WCF_Servicios\WCFDeployFolder
echo %pathWCF%\AdministracionGeneral\bin
pause
copy /Y *.dll %pathWCF%\AdministracionGeneral\bin
copy /Y *.dll %pathWCF%\BancaPrivada\bin
copy /Y *.dll %pathWCF%\Canales1\bin
copy /Y *.dll %pathWCF%\Canales2\bin
copy /Y *.dll %pathWCF%\Clientes\bin
copy /Y *.dll %pathWCF%\Contabilidad\bin
copy /Y *.dll %pathWCF%\Cuentas1\bin
copy /Y *.dll %pathWCF%\Cuentas2\bin
copy /Y *.dll %pathWCF%\Cuentas3\bin
copy /Y *.dll %pathWCF%\DataWarehouse\bin
copy /Y *.dll %pathWCF%\Flujos\bin
copy /Y *.dll %pathWCF%\GestionComercial\bin
copy /Y *.dll %pathWCF%\Inversiones\bin
copy /Y *.dll %pathWCF%\Investigacion\bin
copy /Y *.dll %pathWCF%\OrganismosExternos\bin
copy /Y *.dll %pathWCF%\Riesgos1\bin
copy /Y *.dll %pathWCF%\Riesgos2\bin
copy /Y *.dll %pathWCF%\Riesgos3\bin
copy /Y *.dll %pathWCF%\Riesgos4\bin
copy /Y *.dll %pathWCF%\Riesgos5\bin
copy /Y *.dll %pathWCF%\Seguridades\bin
copy /Y *.dll %pathWCF%\ServiciosInternos\bin
echo "Todo copiado"
set pathPrometeus=D:\@TFS\PrometeusF4.6\Aplicaciones\Prometeus\bin\x86\Debug
echo %pathPrometeus%
copy /Y *.dll %pathPrometeus%
echo "Copiado"
pause