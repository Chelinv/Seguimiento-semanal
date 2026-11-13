USE [pr_autenticacion]
GO

DECLARE @RC int
DECLARE @i_ip varchar(15)='10.3.218.65'
DECLARE @i_machine_secret varchar(500)=
'/fr9HrgQvWGT4p+CY+HS7tyqfQqSsYLKGvxdXkFeZWp/pkJxjO4hWL9IvIm+tUDif6cyE3EBznOEz9BrFehi9nJlq8/rV28SaskdoyHzCW+gIjiXOCeliThFSnmYwb3lW1bCZobN3r3PZ8XoccKmKLsgX9Xg/K1w1dt/C1gZ44wiZijxCA8ovqTvowhMSO8UZ1XYtGX+Gf0='



-- TODO: Set parameter values here.

EXECUTE @RC = [dbo].[spi_machine_secret] 
   @i_ip
  ,@i_machine_secret

update pr_autenticacion..au_aplicacion_servidor
set as_machine_secret = @i_machine_secret
where as_ip_servidor in (@i_ip)

select * from pr_autenticacion..au_aplicacion_servidor
where as_ip_servidor = @i_ip

GO

